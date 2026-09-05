export interface CommerceCartItem {
  id: string;
  variant_id: string;
  quantity: number;
}

export interface CommerceCart {
  id: string;
  items: CommerceCartItem[];
  subtotal: number;
  total: number;
  currency_code: string;
}

export interface CommerceAdapter {
  listProducts(): Promise<unknown[]>;
  getProduct(productId: string): Promise<unknown>;
  getInventory(inventoryItemId: string): Promise<number>;

  createCart(): Promise<CommerceCart>;
  getCart(cartId: string): Promise<CommerceCart>;
  addCartItem(
    cartId: string,
    variantId: string,
    quantity: number
  ): Promise<CommerceCart>;
  updateCartItem(
    cartId: string,
    lineItemId: string,
    quantity: number
  ): Promise<CommerceCart>;
  removeCartItem(
    cartId: string,
    lineItemId: string
  ): Promise<CommerceCart>;
}