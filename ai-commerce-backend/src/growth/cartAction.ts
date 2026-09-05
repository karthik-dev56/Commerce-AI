import commerceAdapter from "../adapters/commerce/medusa.js";
import {
  getGrowthOffer,
  acceptGrowthOffer,
} from "./offer.js";

export async function applyGrowthOfferToCart(
  offerId: string,
  cartId: string
) {
  const offer = getGrowthOffer(offerId);

  if (!offer) {
    throw new Error("OFFER_NOT_FOUND");
  }

  if (offer.status !== "PENDING") {
    throw new Error("OFFER_NOT_ACTIVE");
  }

  if (!offer.recommendedProductId) {
    throw new Error("OFFER_HAS_NO_PRODUCT");
  }

  const product = await commerceAdapter.getProduct(
    offer.recommendedProductId
  ) as any;

  const variants = product.variants ?? [];

  if (!variants.length) {
    throw new Error("PRODUCT_HAS_NO_VARIANT");
  }

  let selectedVariant: any = null;

  for (const variant of variants) {
    const inventoryItems = variant.inventory_items ?? [];
    let inventory = 0;

    for (const inventoryItem of inventoryItems) {
      if (inventoryItem.inventory_item_id) {
        inventory += await commerceAdapter.getInventory(
          inventoryItem.inventory_item_id
        );
      }
    }

    if (inventory > 0) {
      selectedVariant = variant;
      break;
    }
  }

  if (!selectedVariant) {
    throw new Error("PRODUCT_OUT_OF_STOCK");
  }

  const cart = await commerceAdapter.addCartItem(
    cartId,
    selectedVariant.id,
    1
  );

  acceptGrowthOffer(offerId);

  return {
    offerId,
    productId: offer.recommendedProductId,
    variantId: selectedVariant.id,
    cart,
  };
}