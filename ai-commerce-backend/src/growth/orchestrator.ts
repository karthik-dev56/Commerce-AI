import commerceAdapter from "../adapters/commerce/medusa.js";
import { normalizeProduct } from "../products/normalizer.js";
import { getValidatedRelatedProducts } from "../integrations/algolia/validatedRecommendations.js";
import { buildBundle } from "./bundle.js";
import { getProductFamily } from "./productFamily.js";
import {
  defaultGrowthPolicy,
  isGrowthActionAllowed,
  type GrowthPolicy,
} from "./policy.js";

export interface GrowthDecision {
  action: "UPSELL" | "CROSS_SELL" | "BUNDLE" | "DO_NOTHING";
  baseProductId: string;
  recommendedProductId?: string;
  recommendedProductPrice?: number;
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
}

export async function orchestrateGrowth(input: {
  productId: string;
  currentProductPrice: number;
  maxPrice?: number;
  category?: string;
  inStockOnly?: boolean;
  policy?: GrowthPolicy;
}): Promise<GrowthDecision> {
  const policy = input.policy ?? defaultGrowthPolicy;

  const baseProductRaw = await commerceAdapter.getProduct(input.productId);
  const baseProduct = normalizeProduct(baseProductRaw as any, null);
  const baseFamily = getProductFamily(baseProduct);

  if (policy.bundleEnabled) {
    const bundle = await buildBundle({
      productId: input.productId,
      maxPrice: input.maxPrice,
      category: input.category,
      inStockOnly: input.inStockOnly ?? true,
    });

    if (
      bundle &&
      isGrowthActionAllowed(
        "BUNDLE",
        input.currentProductPrice,
        bundle.totalPrice,
        policy
      )
    ) {
      return {
        action: "BUNDLE",
        baseProductId: input.productId,
        recommendedProductId: bundle.products[1]?.id,
        recommendedProductPrice: bundle.totalPrice,
        bundleProducts: bundle.products,
        bundleSeparateTotal: bundle.separateTotal,
        bundleDiscountPercent: bundle.discountPercent,
        bundleDiscountAmount: bundle.discountAmount,
        bundleTotalPrice: bundle.totalPrice,
        reason: bundle.reason,
      };
    }
  }

  const recommendations = await getValidatedRelatedProducts(
    input.productId,
    {
      maxPrice: input.maxPrice,
      category: input.category,
      inStockOnly: input.inStockOnly ?? true,
    },
    6
  );

  if (recommendations.length === 0) {
    return {
      action: "DO_NOTHING",
      baseProductId: input.productId,
      reason:
        "No eligible growth recommendation passed merchant constraints.",
    };
  }

  const candidate = recommendations[0];
  const candidateFamily = getProductFamily(candidate);

  let action: GrowthDecision["action"];

  if (
    baseFamily === "laptop" &&
    candidateFamily === "laptop" &&
    candidate.price.amount > input.currentProductPrice
  ) {
    action = "UPSELL";
  } else {
    action = "CROSS_SELL";
  }

  if (
    !isGrowthActionAllowed(
      action,
      input.currentProductPrice,
      candidate.price.amount,
      policy
    )
  ) {
    return {
      action: "DO_NOTHING",
      baseProductId: input.productId,
      reason: `Recommended ${action.toLowerCase()} is blocked by merchant growth policy.`,
    };
  }

  return {
    action,
    baseProductId: input.productId,
    recommendedProductId: candidate.id,
    recommendedProductPrice: candidate.price.amount,
    reason:
      action === "UPSELL"
        ? "A higher-priced compatible product in the same product family was selected as an upgrade."
        : "A complementary product was selected from the validated recommendation set.",
  };
}