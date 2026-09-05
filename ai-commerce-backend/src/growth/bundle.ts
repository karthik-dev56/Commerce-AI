import { getValidatedRelatedProducts } from "../integrations/algolia/validatedRecommendations.js";
import commerceAdapter from "../adapters/commerce/medusa.js";
import { normalizeProduct } from "../products/normalizer.js";
import { getProductFamily } from "./productFamily.js";
import { defaultGrowthPolicy } from "./policy.js";

export interface GrowthBundle {
  action: "BUNDLE";
  baseProductId: string;
  products: Array<{
    id: string;
    name: string;
    price: number;
  }>;
  separateTotal: number;
  discountPercent: number;
  discountAmount: number;
  totalPrice: number;
  reason: string;
}

export async function buildBundle(input: {
  productId: string;
  maxPrice?: number;
  category?: string;
  inStockOnly?: boolean;
}): Promise<GrowthBundle | null> {
  const baseRaw = await commerceAdapter.getProduct(input.productId);
  const baseProduct = normalizeProduct(baseRaw as any, null);
  const baseFamily = getProductFamily(baseProduct);

  const recommendations = await getValidatedRelatedProducts(
    input.productId,
    {
      category: input.category,
      inStockOnly: input.inStockOnly ?? true,
    },
    10
  );

  const complementary = recommendations.filter((product) => {
    const family = getProductFamily(product);

    if (baseFamily === "laptop") {
      return family === "computer-accessory";
    }

    if (baseFamily === "clothing") {
      return family === "footwear";
    }

    if (baseFamily === "footwear") {
      return family === "clothing";
    }

    if (baseFamily === "computer-accessory") {
      return (
        family === "computer-accessory" &&
        product.id !== baseProduct.id
      );
    }

    if (baseFamily === "audio") {
      return family === "audio";
    }

    if (baseFamily === "television") {
      return family === "television";
    }

    if (baseFamily === "tablet") {
      return family === "tablet";
    }

    if (baseFamily === "appliance") {
      return family === "appliance";
    }

    if (baseFamily === "furniture") {
      return family === "furniture";
    }

    return false;
  });

  if (complementary.length < 1) {
    return null;
  }

  const selected = complementary.slice(0, 2);

  const products = [
    {
      id: baseProduct.id,
      name: baseProduct.name,
      price: baseProduct.price.amount,
    },
    ...selected.map((product) => ({
      id: product.id,
      name: product.name,
      price: product.price.amount,
    })),
  ];

  const separateTotal = products.reduce(
    (total, product) => total + product.price,
    0
  );

  const discountPercent = defaultGrowthPolicy.maxBundleDiscountPercent;

  const discountAmount = Math.round(
    separateTotal * (discountPercent / 100)
  );

  const totalPrice = separateTotal - discountAmount;

  if (
    input.maxPrice !== undefined &&
    totalPrice > input.maxPrice
  ) {
    return null;
  }

  return {
    action: "BUNDLE",
    baseProductId: baseProduct.id,
    products,
    separateTotal,
    discountPercent,
    discountAmount,
    totalPrice,
    reason:
      "A compatible base product and complementary in-stock products were selected with a merchant-approved bundle discount.",
  };
}