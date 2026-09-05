/**
 * Domain types for the storefront.
 *
 * These mirror the shape the backend API (Medusa-backed commerce adapter)
 * is expected to return. UI components depend on these types only — never
 * on a specific transport or data source.
 */

export type CurrencyCode = "INR";

export type InventoryStatus = "in_stock" | "low_stock" | "out_of_stock";

export interface Inventory {
  status: InventoryStatus;
  /** Units available, when the backend exposes it. */
  quantity?: number | undefined;
  /** Human readable delivery estimate, e.g. "Delivery in 2-4 days". */
  deliveryEstimate?: string | undefined;
}

export interface ProductVariant {
  id: string;
  title: string;
  /** Option label the variant belongs to, e.g. "Configuration", "Size". */
  optionName: string;
  price: number;
  compareAtPrice?: number | undefined;
  inventory: Inventory;
  sku?: string | undefined;
}

export interface ProductSpecification {
  label: string;
  value: string;
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  description?: string | undefined;
  productCount?: number | undefined;
}

export interface Product {
  id: string;
  handle: string;
  title: string;
  brand?: string | undefined;
  categorySlug: string;
  categoryName: string;
  shortDescription: string;
  description: string;
  /** Lowest variant price, in major currency units (INR). */
  price: number;
  compareAtPrice?: number | undefined;
  currency: CurrencyCode;
  /** Only present when the backend supplies review data. */
  rating?: number | undefined;
  reviewCount?: number | undefined;
  images: string[];
  variants: ProductVariant[];
  inventory: Inventory;
  specifications: ProductSpecification[];
  shippingInfo?: string | undefined;
  tags: string[];
  popularity?: number | undefined;
}

export interface CartItem {
  id: string;
  productId: string;
  handle: string;
  title: string;
  brand?: string | undefined;
  image?: string | undefined;
  variantId: string;
  variantTitle: string;
  /** Authoritative unit price from the backend cart line, when expanded. */
  unitPrice?: number | undefined;
  /** Authoritative line total from the backend cart, when it supplies one. */
  lineTotal?: number | undefined;
  quantity: number;
  inventory: Inventory;
}

export interface Cart {
  id: string;
  items: CartItem[];
  subtotal: number;
  shipping: number;
  total: number;
  currency: CurrencyCode;
  deliveryEstimate: string;
}

export interface Address {
  id?: string | undefined;
  label?: string | undefined;
  name: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string | undefined;
  city: string;
  state: string;
  pincode: string;
}

export type OrderStatus =
  "processing" | "confirmed" | "shipped" | "delivered" | "payment_failed" | "cancelled";

export interface OrderItem {
  id: string;
  productId: string;
  handle: string;
  title: string;
  brand?: string | undefined;
  image?: string | undefined;
  variantTitle: string;
  quantity: number;
  unitPrice: number;
}

export interface Order {
  id: string;
  createdAt: string;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  total: number;
  currency: CurrencyCode;
  shippingAddress: Address;
  estimatedDelivery: string;
  paymentMethod: string;
}

export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  addresses: Address[];
  preferences: CustomerPreferences;
}

export interface CustomerPreferences {
  personalizedRecommendations: boolean;
  orderUpdatesEmail: boolean;
  orderUpdatesSms: boolean;
  marketingEmails: boolean;
}

export type RecommendationSlot =
  | "home_for_you"
  | "home_popular"
  | "home_complete_setup"
  | "product_related"
  | "product_bought_together"
  | "cart_addons"
  | "search_related";

export interface Recommendation {
  slot: RecommendationSlot;
  title: string;
  /** Short, customer-facing reason. Never internal reasoning. */
  note?: string | undefined;
  products: Product[];
}

export type SortOption = "relevance" | "price_asc" | "price_desc" | "popular";

export interface ProductQuery {
  q?: string | undefined;
  category?: string | undefined;
  minPrice?: number | undefined;
  maxPrice?: number | undefined;
  inStockOnly?: boolean | undefined;
  sort?: SortOption | undefined;
  limit?: number | undefined;
  offset?: number | undefined;
}

export interface ProductListResult {
  products: Product[];
  total: number;
}

/** Result of a natural-language shopping query resolved by the backend. */
export interface SmartSearchResult {
  query: string;
  /** One short, customer-facing sentence. No chain-of-thought. */
  summary?: string | undefined;
  appliedFilters: { label: string; value: string }[];
  products: Product[];
  related: Product[];
}

export interface CheckoutDraft {
  cartId: string;
  address: Address;
  email?: string | undefined;
}

export interface CheckoutSummary {
  items: CartItem[];
  subtotal: number;
  shipping: number;
  total: number;
  currency: CurrencyCode;
  estimatedDelivery: string;
}

export interface PaymentIntent {
  /** Identifier issued by the backend, forwarded to the payment SDK. */
  paymentSessionId: string;
  orderId: string;
  amount: number;
  currency: CurrencyCode;
  /** Publishable key supplied by the backend at runtime. Never a secret. */
  publicKey?: string | undefined;
}

export type PaymentOutcomeStatus = "success" | "failed" | "pending";

export interface PaymentResult {
  status: PaymentOutcomeStatus;
  orderId: string;
  /** Customer-safe message only. */
  message?: string | undefined;
}

export interface ApiErrorShape {
  message: string;
  code?: string | undefined;
  status?: number | undefined;
}
