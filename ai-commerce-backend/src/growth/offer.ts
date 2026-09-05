import crypto from "node:crypto";

import type { GrowthDecision } from "./orchestrator.js";

export type GrowthOfferStatus =
  | "PENDING"
  | "ACCEPTED"
  | "DECLINED"
  | "EXPIRED";

export interface GrowthOffer {
  offerId: string;
  action: GrowthDecision["action"];
  baseProductId: string;
  recommendedProductId?: string;
  recommendedProductName?: string;
  recommendedPrice?: number;
  bundleProducts?: Array<{
    id: string;
    name: string;
    price: number;
  }>;
  bundleSeparateTotal?: number;
  bundleDiscountPercent?: number;
  bundleDiscountAmount?: number;
  bundleTotalPrice?: number;
  reason: string;
  status: GrowthOfferStatus;
  createdAt: string;
  expiresAt: string;
}

const offers = new Map<string, GrowthOffer>();

export function createGrowthOffer(
  decision: GrowthDecision,
  recommendedProductName?: string
): GrowthOffer {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 10 * 60 * 1000);

  const offer: GrowthOffer = {
    offerId: crypto.randomUUID(),
    action: decision.action,
    baseProductId: decision.baseProductId,
    recommendedProductId: decision.recommendedProductId,
    recommendedProductName,
    recommendedPrice: decision.recommendedProductPrice,
    bundleProducts: decision.bundleProducts,
    bundleSeparateTotal: decision.bundleSeparateTotal,
    bundleDiscountPercent: decision.bundleDiscountPercent,
    bundleDiscountAmount: decision.bundleDiscountAmount,
    bundleTotalPrice: decision.bundleTotalPrice,
    reason: decision.reason,
    status: "PENDING",
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };

  offers.set(offer.offerId, offer);

  return offer;
}

export function getGrowthOffer(offerId: string): GrowthOffer | null {
  const offer = offers.get(offerId);

  if (!offer) {
    return null;
  }

  if (
    offer.status === "PENDING" &&
    new Date() > new Date(offer.expiresAt)
  ) {
    offer.status = "EXPIRED";
  }

  return offer;
}

export function acceptGrowthOffer(offerId: string): GrowthOffer {
  const offer = getGrowthOffer(offerId);

  if (!offer) {
    throw new Error("OFFER_NOT_FOUND");
  }

  if (offer.status !== "PENDING") {
    throw new Error("OFFER_NOT_ACTIVE");
  }

  offer.status = "ACCEPTED";

  return offer;
}

export function declineGrowthOffer(offerId: string): GrowthOffer {
  const offer = getGrowthOffer(offerId);

  if (!offer) {
    throw new Error("OFFER_NOT_FOUND");
  }

  if (offer.status !== "PENDING") {
    throw new Error("OFFER_NOT_ACTIVE");
  }

  offer.status = "DECLINED";

  return offer;
}