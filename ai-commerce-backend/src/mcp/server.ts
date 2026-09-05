import commerceAdapter from "../adapters/commerce/medusa.js";
import {
  authorizePayment,
  createPaymentMandate,
} from "../protocols/ap2.js";

export const commerceTools = {
  search_products: async (input: {
    query?: string;
    maxPrice?: number;
    category?: string;
  }) => {
    const products = await commerceAdapter.listProducts();

    return products.filter((product: any) => {
      const price =
        product.variants?.[0]?.calculated_price?.calculated_amount ?? 0;

      const name = product.title?.toLowerCase() ?? "";
      const description = product.description?.toLowerCase() ?? "";

      if (
        input.query &&
        !name.includes(input.query.toLowerCase()) &&
        !description.includes(input.query.toLowerCase())
      ) {
        return false;
      }

      if (input.maxPrice !== undefined && price > input.maxPrice) {
        return false;
      }

      return true;
    });
  },

  get_cart: async (input: { cartId: string }) => {
    return commerceAdapter.getCart(input.cartId);
  },

  create_cart: async () => {
    return commerceAdapter.createCart();
  },

  add_to_cart: async (input: {
    cartId: string;
    variantId: string;
    quantity: number;
  }) => {
    return commerceAdapter.addCartItem(
      input.cartId,
      input.variantId,
      input.quantity
    );
  },

  create_payment_mandate: async (input: {
    sessionId: string;
    cartId: string;
    maxAmount: number;
    currency: string;
  }) => {
    return createPaymentMandate(input);
  },

  authorize_payment: async (input: {
    mandateId: string;
    sessionId: string;
    cartId: string;
    amount: number;
  }) => {
    return authorizePayment(input);
  },
};