import { ApiError, apiRequest, isApiConfigured, simulateLatency } from "./http";
import { productsService } from "./products";
import type { Cart, CartItem, Inventory, Product } from "@/types/commerce";

/**
 * Cart adapter.
 *
 * The authoritative cart lives in Medusa behind our backend API. The frontend
 * persists nothing but the Medusa cart id, never prices, quantities or totals.
 */

const CART_ID_KEY = "commerceai.cartId";

export interface AddToCartInput {
  productId: string;
  variantId: string;
  quantity: number;
}

/* ------------------------------------------------------------------ */
/* Cart id persistence (id only)                                        */
/* ------------------------------------------------------------------ */

export function readCartId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(CART_ID_KEY);
  } catch {
    return null;
  }
}

function writeCartId(id: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CART_ID_KEY, id);
  } catch {
    /* storage unavailable — the cart still works for this page view */
  }
}

function forgetCartId(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(CART_ID_KEY);
  } catch {
    /* ignore */
  }
}

/* ------------------------------------------------------------------ */
/* Backend payload mapping                                              */
/* ------------------------------------------------------------------ */

interface BackendLineItem {
  id?: string;
  line_item_id?: string;
  variant_id?: string;
  variantId?: string;
  product_id?: string;
  productId?: string;
  title?: string;
  description?: string;
  variant_title?: string;
  thumbnail?: string;
  quantity?: number;
  unit_price?: MoneyValue;
  unitPrice?: MoneyValue;
  price?: MoneyValue;
  amount?: MoneyValue;
  original_unit_price?: MoneyValue;
  raw_unit_price?: MoneyValue;
  calculated_price?: MoneyValue;
  original_total?: MoneyValue;
  original_subtotal?: MoneyValue;
  item_total?: MoneyValue;
  item_subtotal?: MoneyValue;
  subtotal?: MoneyValue;
  total?: MoneyValue;
  variant?: {
    calculated_price?: MoneyValue;
    price?: MoneyValue;
    unit_price?: MoneyValue;
  };
}

type MoneyValue =
  | number
  | string
  | {
      value?: number | string;
      amount?: number | string;
      calculated_amount?: number | string;
      raw?: { value?: number | string };
    };

interface BackendCart {
  id?: string;
  items?: BackendLineItem[];
  subtotal?: number;
  shipping_total?: number;
  total?: number;
  currency_code?: string;
}

function emptyCart(id: string): Cart {
  return {
    id,
    items: [],
    subtotal: 0,
    shipping: 0,
    total: 0,
    currency: "INR",
    deliveryEstimate: "",
  };
}

function unwrapCart(payload: unknown): BackendCart {
  const root = (payload ?? {}) as Record<string, unknown> & BackendCart;
  if (root["cart"] && typeof root["cart"] === "object") return root["cart"] as BackendCart;
  for (const key of ["data", "result", "response"] as const) {
    const nested = root[key];
    if (nested && typeof nested === "object") {
      const candidate = unwrapCart(nested);
      if (candidate.id || Array.isArray(candidate.items)) return candidate;
    }
  }
  return root;
}

const UNKNOWN_INVENTORY: Inventory = { status: "in_stock" };

function num(value: unknown): number | undefined {
  if (value && typeof value === "object") {
    const money = value as Exclude<MoneyValue, number | string>;
    return (
      num(money.calculated_amount) ?? num(money.amount) ?? num(money.value) ?? num(money.raw?.value)
    );
  }
  const parsed = typeof value === "string" ? Number(value) : value;
  return typeof parsed === "number" && Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

/**
 * Authoritative per-unit price straight from the backend cart line.
 * Medusa exposes it under several shapes depending on how the line was
 * created (normal add-to-cart vs. growth bundle/upsell), so every known
 * field is consulted before falling back to a line total divided by qty.
 */
function lineUnitPrice(line: BackendLineItem): number | undefined {
  const quantity = line.quantity && line.quantity > 0 ? line.quantity : 1;
  const perUnit = [
    num(line.unit_price),
    num(line.unitPrice),
    num(line.raw_unit_price),
    num(line.original_unit_price),
    num(line.calculated_price),
    num(line.variant?.calculated_price),
    num(line.variant?.unit_price),
    num(line.variant?.price),
    num(line.price),
    num(line.amount),
  ];
  for (const value of perUnit) if (value !== undefined) return value;

  const totals = [
    num(line.item_subtotal),
    num(line.item_total),
    num(line.subtotal),
    num(line.total),
    num(line.original_subtotal),
    num(line.original_total),
  ];
  for (const value of totals) if (value !== undefined) return value / quantity;

  return undefined;
}

/** Authoritative line total: backend total when present, else unit × qty. */
function lineTotal(
  line: BackendLineItem,
  unitPrice: number | undefined,
  quantity: number,
): number | undefined {
  return (
    num(line.item_subtotal) ??
    num(line.item_total) ??
    num(line.subtotal) ??
    num(line.total) ??
    (unitPrice === undefined ? undefined : unitPrice * quantity)
  );
}

/** A mutation answer only replaces state when it really is a full cart. */
function looksLikeCart(payload: unknown): boolean {
  const backend = unwrapCart(payload);
  return typeof backend.id === "string" && Array.isArray(backend.items);
}

/**
 * Runs a cart mutation and always resolves with the authoritative backend cart:
 * the mutation response when it is complete, otherwise a fresh GET /cart/:id.
 */
async function mutateAndSync(cartId: string, request: () => Promise<unknown>): Promise<Cart> {
  let payload: unknown;
  try {
    payload = await request();
  } catch (error) {
    const status = error instanceof ApiError ? error.status : undefined;
    console.error("[cart] mutation failed", { cartId, status, error });
    throw error;
  }
  // A Growth workflow can replace the cart. Always persist the cart identity
  // returned by the backend before the authoritative re-read, otherwise later
  // line mutations combine an old cart id with a new cart's line-item id.
  return syncCartPayload(payload, cartId);
}

/** Persist the backend's current cart identity and fetch its fully expanded state. */
export async function syncCartPayload(payload: unknown, fallbackCartId?: string): Promise<Cart> {
  const responseCart = looksLikeCart(payload) ? unwrapCart(payload) : undefined;
  const authoritativeCartId = responseCart?.id ?? fallbackCartId;
  if (!authoritativeCartId) throw new Error("The backend did not return a cart id");
  writeCartId(authoritativeCartId);
  return fetchCart(authoritativeCartId);
}

/** Catalog lookup so the UI can show real titles, images and brands. */
async function catalogIndex(): Promise<Product[]> {
  try {
    const { products } = await productsService.list({});
    return products;
  } catch {
    return [];
  }
}

function findProduct(catalog: Product[], line: BackendLineItem): Product | undefined {
  const productId = line.product_id ?? line.productId;
  const variantId = line.variant_id ?? line.variantId;
  return (
    catalog.find((product) => productId !== undefined && product.id === productId) ??
    catalog.find((product) =>
      variantId !== undefined ? product.variants.some((v) => v.id === variantId) : false,
    )
  );
}

export async function toCart(payload: unknown): Promise<Cart> {
  const backend = unwrapCart(payload);
  const id = backend.id ?? "";
  if (id) writeCartId(id);
  const lines = Array.isArray(backend.items) ? backend.items : [];
  const catalog = lines.length > 0 ? await catalogIndex() : [];

  const items: CartItem[] = lines.map((line) => {
    const product = findProduct(catalog, line);
    const variantId = line.variant_id ?? line.variantId ?? "";
    const variant = product?.variants.find((candidate) => candidate.id === variantId);
    const image = line.thumbnail ?? product?.images[0];
    const brand = product?.brand;
    const quantity = line.quantity ?? 0;
    const unitPrice = lineUnitPrice(line);
    const authoritativeLineTotal = lineTotal(line, unitPrice, quantity);

    const lineId = line.id ?? line.line_item_id;
    if (!lineId) throw new Error("The backend cart line is missing its line-item id");

    return {
      id: lineId,
      productId: line.product_id ?? line.productId ?? product?.id ?? "",
      handle: product?.handle ?? line.product_id ?? line.productId ?? "",
      title: product?.title ?? line.title ?? "Item",
      ...(brand ? { brand } : {}),
      ...(image ? { image } : {}),
      variantId,
      variantTitle: line.variant_title ?? variant?.title ?? "",
      ...(unitPrice === undefined ? {} : { unitPrice }),
      ...(authoritativeLineTotal === undefined ? {} : { lineTotal: authoritativeLineTotal }),
      quantity,
      inventory: variant?.inventory ?? product?.inventory ?? UNKNOWN_INVENTORY,
    };
  });

  const subtotal = backend.subtotal ?? 0;
  const shipping = backend.shipping_total ?? 0;

  return {
    id,
    items,
    subtotal,
    shipping,
    total: backend.total ?? subtotal + shipping,
    currency: "INR",
    deliveryEstimate: "",
  };
}

/* ------------------------------------------------------------------ */
/* Backend calls                                                        */
/* ------------------------------------------------------------------ */

async function createCart(): Promise<Cart> {
  const cart = await toCart(await apiRequest<unknown>("/cart", { method: "POST" }));
  if (cart.id) writeCartId(cart.id);
  return cart;
}

async function fetchCart(cartId: string): Promise<Cart> {
  return toCart(await apiRequest<unknown>(`/cart/${encodeURIComponent(cartId)}`));
}

/** Returns the current cart id, creating a backend cart on first use. */
async function ensureCartId(): Promise<string> {
  const existing = readCartId();
  if (existing) return existing;
  const created = await createCart();
  return created.id;
}

export const cartService = {
  async get(): Promise<Cart> {
    if (!isApiConfigured()) return simulateLatency(emptyCart("cart_unconfigured"), 0);
    const cartId = readCartId();
    if (!cartId) return emptyCart("");
    try {
      return await fetchCart(cartId);
    } catch {
      // The stored cart no longer exists on the backend — start fresh.
      forgetCartId();
      return emptyCart("");
    }
  },

  async addItem(input: AddToCartInput): Promise<Cart> {
    const cartId = await ensureCartId();
    return mutateAndSync(cartId, () =>
      apiRequest<unknown>(`/cart/${encodeURIComponent(cartId)}/items`, {
        method: "POST",
        body: { variantId: input.variantId, quantity: input.quantity },
      }),
    );
  },

  async updateQuantity(lineItemId: string, quantity: number): Promise<Cart> {
    const cartId = readCartId();
    if (!cartId) return emptyCart("");
    if (quantity <= 0) return this.removeItem(lineItemId);
    return mutateAndSync(cartId, () =>
      apiRequest<unknown>(
        `/cart/${encodeURIComponent(cartId)}/items/${encodeURIComponent(lineItemId)}`,
        { method: "PATCH", body: { quantity } },
      ),
    );
  },

  async removeItem(lineItemId: string): Promise<Cart> {
    const cartId = readCartId();
    if (!cartId) return emptyCart("");
    return mutateAndSync(cartId, () =>
      apiRequest<unknown>(
        `/cart/${encodeURIComponent(cartId)}/items/${encodeURIComponent(lineItemId)}`,
        { method: "DELETE" },
      ),
    );
  },

  /** No bulk-clear endpoint exists: remove each remaining line item. */
  async clear(): Promise<Cart> {
    const cartId = readCartId();
    if (!cartId) return emptyCart("");
    let cart = await this.get();
    for (const item of cart.items) {
      cart = await this.removeItem(item.id);
    }
    forgetCartId();
    return emptyCart("");
  },
};
