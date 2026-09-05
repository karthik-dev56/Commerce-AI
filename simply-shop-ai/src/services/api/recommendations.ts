import { apiRequest, isApiConfigured, simulateLatency } from "./http";
import { unwrapProducts } from "./backend-mappers";
import { products as demoProducts } from "../mock/catalog";
import type { Product, Recommendation, RecommendationSlot } from "@/types/commerce";

/**
 * Recommendations always come from the backend ranking service.
 * The UI only ever renders `Recommendation` objects — it never decides
 * what to recommend.
 */

const SLOT_TITLES: Record<RecommendationSlot, string> = {
  home_for_you: "Recommended for you",
  home_popular: "Popular products",
  home_complete_setup: "Complete your setup",
  product_related: "Related products",
  product_bought_together: "Frequently bought together",
  cart_addons: "You may also need",
  search_related: "You may also like",
};

function byTags(tags: string[], limit: number, exclude: string[] = []): Product[] {
  return demoProducts
    .filter((product) => !exclude.includes(product.id) && product.tags.some((t) => tags.includes(t)))
    .sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))
    .slice(0, limit);
}

function demoRecommendation(slot: RecommendationSlot, context?: string[]): Recommendation {
  const exclude = context ?? [];
  const base = { slot, title: SLOT_TITLES[slot] };

  switch (slot) {
    case "home_for_you":
      return {
        ...base,
        note: "Based on what shoppers like you are buying this week.",
        products: demoProducts
          .filter((p) => (p.rating ?? 0) >= 4.2)
          .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
          .slice(0, 4),
      };
    case "home_popular":
      return {
        ...base,
        products: [...demoProducts].sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0)).slice(0, 8),
      };
    case "home_complete_setup":
      return {
        ...base,
        note: "Desk essentials that pair well with laptops and monitors.",
        products: byTags(["setup", "accessory"], 4),
      };
    case "product_related":
      return { ...base, products: byTags(["setup", "accessory", "laptop"], 4, exclude) };
    case "product_bought_together":
      return { ...base, products: byTags(["accessory", "setup"], 3, exclude) };
    case "cart_addons":
      return { ...base, products: byTags(["accessory", "setup"], 4, exclude) };
    case "search_related":
      return { ...base, products: byTags(["accessory"], 4, exclude) };
  }
}

export const recommendationsService = {
  async get(slot: RecommendationSlot, contextProductIds: string[] = []): Promise<Recommendation> {
    if (isApiConfigured()) {
      // The backend does not expose a recommendation/ranking endpoint yet
      // (Amazon Personalize lands later). Until it does we render nothing
      // rather than inventing recommendations in the frontend.
      return { slot, title: SLOT_TITLES[slot], products: [] };
    }
    return simulateLatency(demoRecommendation(slot, contextProductIds), 260);
  },
};

/**
 * Validated recommendations come from our backend:
 * Medusa → Algolia Related Products → backend validation → this endpoint.
 * The frontend performs no ranking, scoring or filtering of its own.
 */
export interface RecommendationConstraints {
  inStockOnly?: boolean;
  maxPrice?: number;
  category?: string;
}

export async function getValidatedRecommendations(
  productId: string,
  constraints: RecommendationConstraints = { inStockOnly: true },
): Promise<Product[]> {
  if (!isApiConfigured() || !productId) return [];
  const payload = await apiRequest<unknown>(
    `/products/${encodeURIComponent(productId)}/validated-recommendations`,
    { method: "POST", body: constraints },
  );
  return unwrapProducts(payload).filter((product) => product.id !== productId);
}
