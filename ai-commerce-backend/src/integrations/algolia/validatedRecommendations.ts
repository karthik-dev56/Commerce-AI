import { getRelatedProducts } from "./recommend.js";
import commerceAdapter from "../../adapters/commerce/medusa.js";
import { normalizeProduct } from "../../products/normalizer.js";
import {
  applyConstraints,
  type ShoppingConstraints,
} from "../../constraints/engine.js";
import { getProductFamily } from "../../growth/productFamily.js";

function areCompatible(
  source: ReturnType<typeof normalizeProduct>,
  candidate: ReturnType<typeof normalizeProduct>
): boolean {
  const sourceFamily = getProductFamily(source);
  const candidateFamily = getProductFamily(candidate);

  if (sourceFamily === candidateFamily) {
    return true;
  }

  const compatibleFamilies: Record<string, string[]> = {
    laptop: ["computer-accessory"],
    "computer-accessory": ["laptop", "computer-accessory"],
    clothing: ["footwear"],
    footwear: ["clothing"],
    audio: ["audio"],
    television: ["television"],
    tablet: ["tablet"],
    appliance: ["appliance"],
    furniture: ["furniture"],
  };

  return (
    compatibleFamilies[sourceFamily]?.includes(candidateFamily) ?? false
  );
}

export async function getValidatedRelatedProducts(
  productId: string,
  constraints: ShoppingConstraints = {},
  maxRecommendations = 6
) {
  const recommendations = await getRelatedProducts(
    productId,
    maxRecommendations
  );

  const medusaProducts = await commerceAdapter.listProducts();

  const products = [];

  for (const product of medusaProducts) {
    const rawProduct = product as any;
    const inventoryItemIds: string[] = [];

    for (const variant of rawProduct.variants ?? []) {
      for (const inventoryItem of variant.inventory_items ?? []) {
        if (inventoryItem.inventory_item_id) {
          inventoryItemIds.push(inventoryItem.inventory_item_id);
        }
      }
    }

    let inventory: number | null = null;

    if (inventoryItemIds.length > 0) {
      const inventoryValues = await Promise.all(
        inventoryItemIds.map((inventoryItemId) =>
          commerceAdapter.getInventory(inventoryItemId)
        )
      );

      inventory = inventoryValues.reduce(
        (total, value) => total + value,
        0
      );
    }

    products.push(normalizeProduct(rawProduct, inventory));
  }

  const sourceProduct = products.find(
    (product) => product.id === productId
  );

  if (!sourceProduct) {
    return [];
  }

  const eligibleProducts = applyConstraints(
    products,
    constraints
  ).filter(
    (product) =>
      product.id !== productId &&
      areCompatible(sourceProduct, product)
  );

  const eligibleProductIds = new Set(
    eligibleProducts.map((product) => product.id)
  );

  return recommendations
    .filter((recommendation) => {
      if (!("objectID" in recommendation)) {
        return false;
      }

      return eligibleProductIds.has(recommendation.objectID);
    })
    .map((recommendation) => {
      if (!("objectID" in recommendation)) {
        return null;
      }

      const product = eligibleProducts.find(
        (item) => item.id === recommendation.objectID
      );

      if (!product) {
        return null;
      }

      return {
        ...product,
        recommendationScore: recommendation._score ?? null,
      };
    })
    .filter(
      (
        product
      ): product is NonNullable<typeof product> => product !== null
    );
}