export interface UcpProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  availability: string;
  image?: string;
  brand?: string;
  category?: string;
}

export interface UcpCart {
  id: string;
  items: Array<{
    id: string;
    productId: string;
    variantId: string;
    quantity: number;
    unitPrice: number;
  }>;
  subtotal: number;
  total: number;
  currency: string;
}

export interface UcpCheckout {
  cartId: string;
  total: number;
  currency: string;
  status: "READY_FOR_PAYMENT" | "PAYMENT_PENDING" | "COMPLETED" | "FAILED";
}

export interface UcpCommerceContract {
  discover(input: {
    query?: string;
    maxPrice?: number;
    category?: string;
  }): Promise<UcpProduct[]>;

  getCart(cartId: string): Promise<UcpCart>;

  checkout(cartId: string): Promise<UcpCheckout>;
}
