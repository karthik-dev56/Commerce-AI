import type { ProductQuery, SortOption } from "@/types/commerce";

/** URL search-param shape for the product listing page. */
export interface ProductSearchParams {
  q: string;
  category: string;
  sort: SortOption;
  min: number;
  max: number;
  inStock: boolean;
}

export const PRICE_FLOOR = 0;
export const PRICE_CEILING = 100000;

export const DEFAULT_PRODUCT_SEARCH: ProductSearchParams = {
  q: "",
  category: "",
  sort: "relevance",
  min: PRICE_FLOOR,
  max: PRICE_CEILING,
  inStock: false,
};

const SORT_VALUES: SortOption[] = ["relevance", "price_asc", "price_desc", "popular"];

export function parseProductSearch(search: Record<string, unknown>): ProductSearchParams {
  const sort = String(search["sort"] ?? "relevance") as SortOption;
  return {
    q: typeof search["q"] === "string" ? search["q"] : "",
    category: typeof search["category"] === "string" ? search["category"] : "",
    sort: SORT_VALUES.includes(sort) ? sort : "relevance",
    min: Number.isFinite(Number(search["min"])) ? Number(search["min"] ?? PRICE_FLOOR) : PRICE_FLOOR,
    max: Number.isFinite(Number(search["max"])) ? Number(search["max"] ?? PRICE_CEILING) : PRICE_CEILING,
    inStock: search["inStock"] === true || search["inStock"] === "true",
  };
}

export function toProductQuery(params: ProductSearchParams): ProductQuery {
  return {
    q: params.q || undefined,
    category: params.category || undefined,
    minPrice: params.min > PRICE_FLOOR ? params.min : undefined,
    maxPrice: params.max < PRICE_CEILING ? params.max : undefined,
    inStockOnly: params.inStock,
    sort: params.sort,
  };
}

export const SORT_LABELS: { value: SortOption; label: string }[] = [
  { value: "relevance", label: "Relevance" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "popular", label: "Popular" },
];
