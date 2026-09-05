import Medusa from "@medusajs/js-sdk";
import type {
  CommerceAdapter,
  CommerceCart,
} from "./interface.js";

const medusa = new Medusa({
  baseUrl: process.env.MEDUSA_URL || "http://localhost:9000",
  publishableKey: process.env.MEDUSA_PUBLISHABLE_KEY,
});

const medusaAdmin = new Medusa({
  baseUrl: process.env.MEDUSA_URL || "http://localhost:9000",
  apiKey: process.env.MEDUSA_SECRET_API_KEY,
});

const regionId = process.env.MEDUSA_REGION_ID;
const salesChannelId = process.env.MEDUSA_SALES_CHANNEL_ID;

function normalizeCart(cart: any): CommerceCart {
  return {
    id: cart.id,
    items: (cart.items ?? []).map((item: any) => ({
      id: item.id,
      variant_id: item.variant_id,
      quantity: item.quantity,
    })),
    subtotal: cart.subtotal ?? 0,
    total: cart.total ?? 0,
    currency_code: cart.currency_code ?? "inr",
  };
}

const commerceAdapter: CommerceAdapter = {
  async listProducts() {
    const response = await medusa.store.product.list({
      region_id: regionId,
      sales_channel_id: salesChannelId,
      fields:
        "*variants.calculated_price,*variants.inventory_items,*categories,*type,+tags,+metadata",
      limit: 50,
    });

    return response.products;
  },

  async getProduct(productId: string) {
    const response = await medusa.store.product.retrieve(productId, {
      region_id: regionId,
      sales_channel_id: salesChannelId,
      fields:
        "*variants.calculated_price,*variants.inventory_items,*categories,*type,+tags,+metadata",
    });

    return response.product;
  },

  async getInventory(inventoryItemId: string) {
    const response =
      await medusaAdmin.admin.inventoryItem.listLevels(inventoryItemId);

    return response.inventory_levels.reduce(
      (
        total: number,
        level: { stocked_quantity?: number | null }
      ) => total + (level.stocked_quantity ?? 0),
      0
    );
  },

  async createCart() {
    const response = await medusa.store.cart.create({
      region_id: regionId!,
      sales_channel_id: salesChannelId!,
    });

    return normalizeCart(response.cart);
  },

  async getCart(cartId: string) {
    const response = await medusa.store.cart.retrieve(cartId);

    return normalizeCart(response.cart);
  },

  async addCartItem(
    cartId: string,
    variantId: string,
    quantity: number
  ) {
    const response = await medusa.store.cart.createLineItem(cartId, {
      variant_id: variantId,
      quantity,
    });

    return normalizeCart(response.cart);
  },

  async updateCartItem(
    cartId: string,
    lineItemId: string,
    quantity: number
  ) {
    const response = await medusa.store.cart.updateLineItem(
      cartId,
      lineItemId,
      {
        quantity,
      }
    );

    return normalizeCart(response.cart);
  },

  async removeCartItem(
    cartId: string,
    lineItemId: string
  ) {
    const response = await medusa.store.cart.deleteLineItem(
      cartId,
      lineItemId
    );

    return normalizeCart(response.cart);
  },
};

export default commerceAdapter;