import { apiRequest, isApiConfigured, simulateLatency } from "./http";
import { unwrapProduct, unwrapProducts, slugify } from "./backend-mappers";
import { categories as demoCategories, products as demoProducts } from "../mock/catalog";
import type {
  Category,
  Product,
  ProductListResult,
  ProductQuery,
  SmartSearchResult,
} from "@/types/commerce";

/* ------------------------------------------------------------------ */
/* Shared, source-agnostic helpers                                      */
/* ------------------------------------------------------------------ */

/**
 * Applies the shopper's explicit listing controls (search box, category,
 * price range, availability, sort). This is presentation filtering of a list
 * the backend returned — never ranking, scoring or recommendation logic.
 */
function applyListControls(list: Product[], query: ProductQuery): Product[] {
  const term = query.q?.trim().toLowerCase();
  let result = list.filter((product) => {
    if (term) {
      const haystack = [product.title, product.brand ?? "", product.description, product.categoryName]
        .join(" ")
        .toLowerCase();
      const words = term.split(/\s+/).filter((word) => word.length > 2);
      if (words.length > 0 && !words.some((word) => haystack.includes(word))) return false;
    }
    if (query.category && product.categorySlug !== query.category) return false;
    if (query.minPrice !== undefined && product.price < query.minPrice) return false;
    if (query.maxPrice !== undefined && product.price > query.maxPrice) return false;
    if (query.inStockOnly && product.inventory.status === "out_of_stock") return false;
    return true;
  });

  if (query.sort === "price_asc") result = [...result].sort((a, b) => a.price - b.price);
  if (query.sort === "price_desc") result = [...result].sort((a, b) => b.price - a.price);
  // "relevance" and "popular" keep the order the backend returned.
  return result;
}

function categoriesFrom(list: Product[]): Category[] {
  const map = new Map<string, Category>();
  for (const product of list) {
    const existing = map.get(product.categorySlug);
    if (existing) {
      existing.productCount = (existing.productCount ?? 0) + 1;
    } else {
      map.set(product.categorySlug, {
        id: product.categorySlug,
        slug: product.categorySlug,
        name: product.categoryName,
        productCount: 1,
      });
    }
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/* ------------------------------------------------------------------ */
/* Real backend adapter (AI Commerce Backend → Medusa)                  */
/* ------------------------------------------------------------------ */

async function fetchCatalog(): Promise<Product[]> {
  const payload = await apiRequest<unknown>("/products");
  return unwrapProducts(payload);
}

/* ------------------------------------------------------------------ */
/* Demo adapter — only used when VITE_API_BASE_URL is empty             */
/* ------------------------------------------------------------------ */

function demoList(query: ProductQuery): ProductListResult {
  const filtered = applyListControls(demoProducts, query);
  const offset = query.offset ?? 0;
  const limit = query.limit ?? filtered.length;
  return { products: filtered.slice(offset, offset + limit), total: filtered.length };
}

function demoSmartSearch(rawQuery: string): SmartSearchResult {
  const query = rawQuery.trim();
  const products = applyListControls(demoProducts, { q: query }).slice(0, 12);
  return {
    query,
    summary: "Showing the closest matches from the development catalogue.",
    appliedFilters: [],
    products,
    related: [],
  };
}

/* ------------------------------------------------------------------ */
/* Public service API                                                   */
/* ------------------------------------------------------------------ */

export const productsService = {
  async list(query: ProductQuery = {}): Promise<ProductListResult> {
    if (isApiConfigured()) {
      const catalog = await fetchCatalog();
      const filtered = applyListControls(catalog, query);
      const offset = query.offset ?? 0;
      const limit = query.limit ?? filtered.length;
      return { products: filtered.slice(offset, offset + limit), total: filtered.length };
    }
    return simulateLatency(demoList(query));
  },

  /** `id` is the Medusa product id on the real backend, the handle in demo mode. */
  async getById(id: string): Promise<Product | null> {
    if (isApiConfigured()) {
      const payload = await apiRequest<unknown>(`/products/${encodeURIComponent(id)}`);
      const direct = unwrapProduct((payload as { product?: unknown })?.product ?? payload);
      return direct;
    }
    return simulateLatency(
      demoProducts.find((product) => product.handle === id || product.id === id) ?? null,
    );
  },

  /** Kept for route compatibility: the route param carries the product id. */
  async getByHandle(handle: string): Promise<Product | null> {
    return this.getById(handle);
  },

  async getManyByIds(ids: string[]): Promise<Product[]> {
    if (ids.length === 0) return [];
    if (isApiConfigured()) {
      const results = await Promise.all(ids.map((id) => this.getById(id)));
      return results.filter((product): product is Product => product !== null);
    }
    return simulateLatency(demoProducts.filter((product) => ids.includes(product.id)));
  },

  async categories(): Promise<Category[]> {
    if (isApiConfigured()) return categoriesFrom(await fetchCatalog());
    return simulateLatency(
      demoCategories.map((category) => ({
        ...category,
        productCount: demoProducts.filter((p) => p.categorySlug === category.slug).length,
      })),
    );
  },

  /**
   * Natural-language shopping query.
   * All intent extraction, constraint filtering and ranking happens in the
   * backend (Gemini → constraints → Medusa catalogue). The frontend only
   * renders what comes back.
   */
  async smartSearch(query: string): Promise<SmartSearchResult> {
    if (isApiConfigured()) {
      const payload = await apiRequest<Record<string, unknown>>("/products/smart-search", {
        method: "POST",
        body: { message: query },
      });
      const products = unwrapProducts(payload);
      const summary =
        typeof payload["summary"] === "string"
          ? (payload["summary"] as string)
          : typeof payload["message"] === "string"
            ? (payload["message"] as string)
            : undefined;

      const constraints = (payload["constraints"] ?? payload["intent"]) as
        | Record<string, unknown>
        | undefined;
      const appliedFilters: SmartSearchResult["appliedFilters"] = [];
      if (constraints && typeof constraints === "object") {
        for (const [label, value] of Object.entries(constraints)) {
          if (value === null || value === undefined || typeof value === "object") continue;
          appliedFilters.push({
            label: label.replace(/[_-]+/g, " ").replace(/^./, (c) => c.toUpperCase()),
            value: String(value),
          });
        }
      }

      return {
        query,
        ...(summary ? { summary } : {}),
        appliedFilters,
        products,
        related: [],
      };
    }
    return simulateLatency(demoSmartSearch(query), 420);
  },
};

export { slugify };
