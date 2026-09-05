export interface ShoppingIntent {
  maxPrice?: number;
  minPrice?: number;

  /**
   * Normalized product category from the merchant catalog.
   * Example: "Electronics", "Furniture", "Fashion".
   */
  category?: string;

  /**
   * Product-type or feature terms.
   * Example: ["table"], ["gaming", "laptop"].
   */
  keywords: string[];

  useCases: string[];

  inStockOnly: boolean;
}