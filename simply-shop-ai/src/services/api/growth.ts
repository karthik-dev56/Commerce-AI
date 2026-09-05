import { unwrapProduct } from "./backend-mappers";
import { readCartId, syncCartPayload } from "./cart";
import { API_BASE_URL, apiRequest, isApiConfigured } from "./http";

import type { Cart, Product } from "@/types/commerce";

/**
 * Merchant-only Growth reporting.
 *
 * Both endpoints are protected by backend merchant authorization; the frontend
 * never computes analytics and never fabricates audit events.
 */

export interface GrowthAnalytics {
  totalOffers: number;
  acceptedOffers: number;
  acceptanceRate: number;
  influencedRevenue: number;
  upsells: number;
  crossSells: number;
  bundles: number;
  failures: number;
  currency?: string | undefined;
}

export interface GrowthAuditEvent {
  id?: string | undefined;
  event: string;
  action?: string | undefined;
  baseProduct?: string | undefined;
  recommendedProduct?: string | undefined;
  amount?: number | undefined;
  currency?: string | undefined;
  reason?: string | undefined;
  offerId?: string | undefined;
  timestamp?: string | undefined;
  /** Optional backend metadata bag (e.g. Klaviyo event payload). */
  metadata?: Record<string, unknown> | undefined;
}

function num(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function str(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function pick(source: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    if (source[key] !== undefined && source[key] !== null) return source[key];
  }
  return undefined;
}

function unwrap(payload: unknown, keys: string[]): Record<string, unknown> {
  const root = (payload ?? {}) as Record<string, unknown>;
  for (const key of keys) {
    const nested = root[key];
    if (nested && typeof nested === "object" && !Array.isArray(nested)) {
      return nested as Record<string, unknown>;
    }
  }
  return root;
}

function mapAnalytics(payload: unknown): GrowthAnalytics {
  const raw = unwrap(payload, ["analytics", "data", "metrics"]);
  const total = num(pick(raw, ["totalOffers", "total_offers", "offers", "totalGrowthOffers"]));
  const accepted = num(pick(raw, ["acceptedOffers", "accepted_offers", "accepted"]));
  const rateRaw = pick(raw, ["acceptanceRate", "acceptance_rate"]);
  return {
    totalOffers: total,
    acceptedOffers: accepted,
    acceptanceRate: rateRaw === undefined ? (total > 0 ? accepted / total : 0) : num(rateRaw),
    influencedRevenue: num(
      pick(raw, ["influencedRevenue", "influenced_revenue", "revenue", "incrementalRevenue"]),
    ),
    upsells: num(pick(raw, ["upsells", "upsell", "UPSELL"])),
    crossSells: num(pick(raw, ["crossSells", "cross_sells", "crossSell", "CROSS_SELL"])),
    bundles: num(pick(raw, ["bundles", "bundle", "BUNDLE"])),
    failures: num(pick(raw, ["failures", "growthFailures", "growth_failures", "errors"])),
    currency: str(pick(raw, ["currency", "currency_code"])),
  };
}

function mapAuditEvent(entry: unknown, index: number): GrowthAuditEvent {
  const raw = (entry ?? {}) as Record<string, unknown>;
  const amount = pick(raw, ["amount", "value", "influencedAmount", "influenced_amount"]);
  const metadataRaw = raw["metadata"];
  const metadata =
    metadataRaw && typeof metadataRaw === "object" && !Array.isArray(metadataRaw)
      ? (metadataRaw as Record<string, unknown>)
      : undefined;
  return {
    id: str(pick(raw, ["id", "eventId", "event_id"])) ?? `growth-audit-${index}`,
    event: str(pick(raw, ["event", "eventType", "event_type", "type"])) ?? "GROWTH_EVENT",
    action: str(pick(raw, ["action", "decision", "growthAction", "growth_action"])),
    baseProduct: str(pick(raw, ["baseProduct", "base_product", "baseProductId", "sourceProduct"])),
    recommendedProduct: str(
      pick(raw, [
        "recommendedProduct",
        "recommended_product",
        "recommendedProductId",
        "targetProduct",
      ]),
    ),
    amount: typeof amount === "number" ? amount : undefined,
    currency: str(pick(raw, ["currency", "currency_code"])),
    reason: str(pick(raw, ["reason", "explanation", "message"])),
    offerId: str(pick(raw, ["offerId", "offer_id"])),
    timestamp: str(pick(raw, ["timestamp", "createdAt", "created_at", "time"])),
    metadata,
  };
}

function mapAuditList(payload: unknown): GrowthAuditEvent[] {
  if (Array.isArray(payload)) return payload.map(mapAuditEvent);
  const root = (payload ?? {}) as Record<string, unknown>;
  for (const key of ["audit", "events", "auditTrail", "audit_trail", "data", "results"]) {
    const list = root[key];
    if (Array.isArray(list)) return list.map(mapAuditEvent);
  }
  return [];
}

export const growthService = {
  async analytics(): Promise<GrowthAnalytics> {
    if (!isApiConfigured()) throw new Error("API base URL is not configured");
    return mapAnalytics(await apiRequest<unknown>("/growth/analytics"));
  },

  async audit(): Promise<GrowthAuditEvent[]> {
    if (!isApiConfigured()) throw new Error("API base URL is not configured");
    return mapAuditList(await apiRequest<unknown>("/growth/audit"));
  },
};

/* ------------------------------------------------------------------ */
/* Customer-facing Growth Orchestrator                                  */
/* ------------------------------------------------------------------ */

export type GrowthAction = "UPSELL" | "CROSS_SELL" | "BUNDLE" | "DO_NOTHING";

export interface BundleProduct {
  id: string;
  name: string;
  price: number;
}

export interface GrowthDecision {
  action: GrowthAction;
  reason?: string | undefined;
  /** Product embedded in the response, when the backend supplies one. */
  product: Product | null;
  /** Product ids returned by the orchestrator; resolved via the catalog API. */
  baseProductId?: string | undefined;
  recommendedProductId?: string | undefined;
  /** Offer / bundle price as returned by the backend. */
  offerAmount?: number | undefined;
  currency?: string | undefined;
  /** Bundle details returned by the backend for BUNDLE actions. */
  products?: BundleProduct[] | undefined;
  separateTotal?: number | undefined;
  discountPercent?: number | undefined;
  discountAmount?: number | undefined;
  totalPrice?: number | undefined;
}

export interface GrowthRecommendationInput {
  productId: string;
  /** Real current product price in major currency units (INR). */
  currentProductPrice: number;
  sessionId: string;
  cartId?: string | undefined;
}

function normaliseAction(value: unknown): GrowthAction {
  const raw = typeof value === "string" ? value.toUpperCase().replace(/[\s-]/g, "_") : "";
  if (raw === "UPSELL" || raw === "CROSS_SELL" || raw === "BUNDLE") return raw;
  return "DO_NOTHING";
}

function optNum(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function mapBundleProduct(raw: unknown): BundleProduct | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const item = raw as Record<string, unknown>;
  const id = str(item["id"]);
  const name = str(item["name"]);
  if (!id || !name) return null;
  return { id, name, price: optNum(item["price"]) ?? 0 };
}

function mapDecision(payload: unknown): GrowthDecision {
  const raw = unwrap(payload, ["decision", "growthDecision", "growth_decision", "data", "result"]);
  const action = normaliseAction(
    pick(raw, ["action", "decision", "type", "growthAction", "growth_action"]),
  );
  const productSource = pick(raw, [
    "recommendedProduct",
    "recommended_product",
    "product",
    "canonical",
    "target",
  ]);
  const amount = pick(raw, [
    "recommendedProductPrice",
    "recommended_product_price",
    "bundlePrice",
    "bundle_price",
    "offerAmount",
    "offer_amount",
    "price",
    "amount",
  ]);
  const productsRaw = pick(raw, ["products", "bundleProducts", "bundle_products", "items"]);
  const products = Array.isArray(productsRaw)
    ? productsRaw.map(mapBundleProduct).filter((p): p is BundleProduct => p !== null)
    : undefined;

  return {
    action,
    reason: str(pick(raw, ["reason", "explanation", "message", "rationale"])),
    product: productSource ? unwrapProduct(productSource) : null,
    baseProductId: str(pick(raw, ["baseProductId", "base_product_id", "baseProduct"])),
    recommendedProductId: str(pick(raw, ["recommendedProductId", "recommended_product_id"])),
    offerAmount: typeof amount === "number" ? amount : undefined,
    currency: str(pick(raw, ["currency", "currency_code"])),
    products,
    separateTotal: optNum(
      pick(raw, ["separateTotal", "separate_total", "separatePrice", "separate_price"]),
    ),
    discountPercent: optNum(pick(raw, ["discountPercent", "discount_percent", "discount"])),
    discountAmount: optNum(pick(raw, ["discountAmount", "discount_amount", "savings"])),
    totalPrice: optNum(
      pick(raw, ["totalPrice", "total_price", "total", "bundleTotal", "bundle_total"]),
    ),
  };
}

export interface GrowthOffer {
  offerId: string;
  expiresAt?: string | undefined;
  amount?: number | undefined;
  currency?: string | undefined;
}

export interface GrowthOfferInput {
  productId: string;
  currentProductPrice: number;
  sessionId: string;
  cartId?: string | undefined;
  maxPrice?: number | undefined;
  category?: string | undefined;
  inStockOnly?: boolean | undefined;
}

function mapOffer(payload: unknown): GrowthOffer | null {
  const raw = unwrap(payload, ["offer", "data", "result"]);
  const offerId = str(pick(raw, ["offerId", "offer_id", "id"]));
  if (!offerId || offerId.startsWith("prod_")) return null;
  const amount = pick(raw, ["amount", "offerAmount", "offer_amount", "price"]);
  return {
    offerId,
    expiresAt: str(pick(raw, ["expiresAt", "expires_at", "validUntil"])),
    amount: typeof amount === "number" ? amount : undefined,
    currency: str(pick(raw, ["currency", "currency_code"])),
  };
}

export const growthOfferService = {
  /** Ask the backend Growth Orchestrator for a decision on the viewed product. */
  async recommendation(input: GrowthRecommendationInput): Promise<GrowthDecision> {
    if (!isApiConfigured()) throw new Error("API base URL is not configured");
    const payload = await apiRequest<unknown>("/growth/recommendation", {
      method: "POST",
      body: {
        productId: input.productId,
        currentProductPrice: input.currentProductPrice,
        sessionId: input.sessionId,
        ...(input.cartId ? { cartId: input.cartId } : {}),
      },
    });
    console.log("[growth] POST /growth/recommendation response:", payload);
    return mapDecision(payload);
  },

  /**
   * Create the real offer for an eligible decision. The request mirrors the
   * recommendation request (same real product context) and adds the decision
   * the orchestrator returned. The backend issues the offerId.
   */
  async createOffer(
    decision: GrowthDecision,
    context: GrowthOfferInput,
  ): Promise<GrowthOffer | null> {
    if (!isApiConfigured()) throw new Error("API base URL is not configured");
    const inStockOnly = context.inStockOnly ?? true;
    console.log("[growth] creating offer", {
      productId: context.productId,
      currentProductPrice: context.currentProductPrice,
      maxPrice: context.maxPrice,
      category: context.category,
      inStockOnly,
      sessionId: context.sessionId,
    });

    const body = {
      productId: context.productId,
      currentProductPrice: context.currentProductPrice,
      inStockOnly,
      sessionId: context.sessionId,
      ...(context.maxPrice !== undefined ? { maxPrice: context.maxPrice } : {}),
      ...(context.category ? { category: context.category } : {}),
      ...(context.cartId ? { cartId: context.cartId } : {}),
      action: decision.action,
      ...(decision.baseProductId ? { baseProductId: decision.baseProductId } : {}),
      ...(decision.recommendedProductId
        ? { recommendedProductId: decision.recommendedProductId }
        : {}),
      ...(decision.offerAmount !== undefined
        ? { recommendedProductPrice: decision.offerAmount }
        : {}),
      ...(decision.reason ? { reason: decision.reason } : {}),
    };

    // Raw fetch so the backend's own error body is never hidden from the console.
    const url = new URL("growth/offer", API_BASE_URL.replace(/\/?$/, "/")).toString();
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });
    const text = await response.text();
    let parsed: unknown = undefined;
    try {
      parsed = text ? JSON.parse(text) : undefined;
    } catch {
      parsed = text;
    }

    if (!response.ok) {
      console.error("[growth] offer creation failed", {
        status: response.status,
        requestBody: body,
        responseBody: parsed ?? text,
      });
      throw new Error(
        typeof parsed === "object" && parsed && "message" in parsed
          ? String((parsed as { message?: unknown }).message)
          : `Offer creation failed (${response.status})`,
      );
    }

    console.log("[growth] offer created", parsed);
    return mapOffer(parsed);
  },

  /** Backend applies the offer to the real Medusa cart. */
  async applyOffer(offerId: string): Promise<Cart> {
    if (!isApiConfigured()) throw new Error("API base URL is not configured");
    const cartId = readCartId() ?? undefined;
    console.log("[growth] applying offer", { offerId, cartId });
    const payload = await apiRequest<unknown>(
      `/growth/offer/${encodeURIComponent(offerId)}/apply`,
      { method: "POST", body: { cartId } },
    );
    return syncCartPayload(payload, cartId);
  },

  async declineOffer(offerId: string): Promise<void> {
    if (!isApiConfigured()) return;
    console.log("[growth] declining offer", { offerId });
    await apiRequest<unknown>(`/growth/offer/${encodeURIComponent(offerId)}/decline`, {
      method: "POST",
    });
  },
};
