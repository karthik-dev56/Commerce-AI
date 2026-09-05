export interface GrowthPolicy {
  upsellEnabled: boolean;
  crossSellEnabled: boolean;
  bundleEnabled: boolean;
  maxUpsellAmount: number;
  maxBundleDiscountPercent: number;
  requireCustomerConsent: boolean;
}

export const defaultGrowthPolicy: GrowthPolicy = {
  upsellEnabled: true,
  crossSellEnabled: true,
  bundleEnabled: true,
  maxUpsellAmount: 10000,
  maxBundleDiscountPercent: 10,
  requireCustomerConsent: true,
};

export function isGrowthActionAllowed(
  action: "UPSELL" | "CROSS_SELL" | "BUNDLE" | "DO_NOTHING",
  currentPrice: number,
  recommendedPrice: number,
  policy: GrowthPolicy = defaultGrowthPolicy
): boolean {
  if (action === "DO_NOTHING") return true;

  if (action === "UPSELL") {
    if (!policy.upsellEnabled) return false;
    return recommendedPrice - currentPrice <= policy.maxUpsellAmount;
  }

  if (action === "CROSS_SELL") {
    return policy.crossSellEnabled;
  }

  if (action === "BUNDLE") {
    if (!policy.bundleEnabled) return false;
    return recommendedPrice >= 0;
  }

  return false;
}