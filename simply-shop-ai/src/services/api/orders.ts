import { apiRequest, isApiConfigured, simulateLatency } from "./http";
import { products as demoProducts } from "../mock/catalog";
import type { Order, OrderItem, OrderStatus } from "@/types/commerce";

const STORAGE_KEY = "commerceai.orders.v1";

function toOrderItem(productId: string, quantity: number): OrderItem | null {
  const product = demoProducts.find((candidate) => candidate.id === productId);
  if (!product) return null;
  return {
    id: `oi_${product.id}`,
    productId: product.id,
    handle: product.handle,
    title: product.title,
    brand: product.brand,
    image: product.images[0] ?? "",
    variantTitle: product.variants[0]?.title ?? "Standard",
    quantity,
    unitPrice: product.price,
  };
}

function seedOrders(): Order[] {
  const build = (
    id: string,
    daysAgo: number,
    status: OrderStatus,
    lines: [string, number][],
  ): Order => {
    const items = lines
      .map(([productId, quantity]) => toOrderItem(productId, quantity))
      .filter((item): item is OrderItem => item !== null);
    const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const created = new Date(Date.now() - daysAgo * 86_400_000);
    return {
      id,
      createdAt: created.toISOString(),
      status,
      items,
      subtotal,
      shipping: 0,
      total: subtotal,
      currency: "INR",
      shippingAddress: {
        name: "Aarav Sharma",
        phone: "+91 98200 11223",
        addressLine1: "402, Sunrise Residency, Baner Road",
        city: "Pune",
        state: "Maharashtra",
        pincode: "411045",
      },
      estimatedDelivery: new Date(created.getTime() + 5 * 86_400_000).toISOString(),
      paymentMethod: "UPI",
    };
  };

  return [
    build("ORD-24815", 3, "shipped", [
      ["prod_samsung_27_4k", 1],
      ["prod_logitech_k380", 1],
    ]),
    build("ORD-24730", 12, "delivered", [["prod_sony_wh_ch720n", 1]]),
    build("ORD-24688", 26, "cancelled", [["prod_philips_air_fryer", 1]]),
  ];
}

function readLocal(): Order[] {
  if (typeof window === "undefined") return seedOrders();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const stored = raw ? (JSON.parse(raw) as Order[]) : [];
    return [...stored, ...seedOrders()];
  } catch {
    return seedOrders();
  }
}

export function persistLocalOrder(order: Order): void {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const stored = raw ? (JSON.parse(raw) as Order[]) : [];
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([order, ...stored].slice(0, 20)));
  } catch {
    /* storage unavailable — the backend is the source of truth in production */
  }
}

export const ordersService = {
  async list(): Promise<Order[]> {
    if (isApiConfigured()) return apiRequest<Order[]>("/orders");
    return simulateLatency(
      readLocal().sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
      200,
    );
  },

  async get(orderId: string): Promise<Order | null> {
    if (isApiConfigured()) return apiRequest<Order | null>(`/orders/${orderId}`);
    return simulateLatency(readLocal().find((order) => order.id === orderId) ?? null, 180);
  },
};
