import aa from "search-insights";

/**
 * Algolia Insights: authenticated-user identification and product view events.
 * Only the public search key is used here — the write key stays backend-only.
 * Tracking failures must never affect the storefront.
 */

const appId = import.meta.env["VITE_ALGOLIA_APP_ID"] as string | undefined;
const searchApiKey = import.meta.env["VITE_ALGOLIA_SEARCH_API_KEY"] as string | undefined;
const indexName = (import.meta.env["VITE_ALGOLIA_INDEX_NAME"] as string | undefined) || "products";

let initialized = false;

export function initAlgoliaInsights(): void {
  if (initialized || typeof window === "undefined") return;
  if (!appId || !searchApiKey) {
    console.warn("Algolia Insights is not configured");
    return;
  }
  try {
    aa("init", { appId, apiKey: searchApiKey, useCookie: true });
    initialized = true;
  } catch (error) {
    console.error("Algolia Insights failed to initialize", error);
  }
}

export function identifyAlgoliaUser(userId: string): void {
  if (!initialized || !userId) return;
  try {
    aa("setUserToken", userId);
    aa("setAuthenticatedUserToken", userId);
  } catch (error) {
    console.error("Algolia Insights failed to identify the user", error);
  }
}

export function trackProductViewed(productId: string): void {
  if (!initialized || !productId) return;
  try {
    aa("viewedObjectIDs", {
      index: indexName,
      eventName: "Product Viewed",
      objectIDs: [productId],
    });
  } catch (error) {
    console.error("Algolia Insights failed to track a product view", error);
  }
}

export function trackRecommendationsViewed(productIds: string[]): void {
  if (!initialized || productIds.length === 0) return;
  try {
    aa("viewedObjectIDs", {
      index: indexName,
      eventName: "Recommendations Viewed",
      objectIDs: productIds.slice(0, 20),
    });
  } catch (error) {
    console.error("Algolia Insights failed to track recommendation views", error);
  }
}

export function trackRecommendationClicked(productId: string, position?: number): void {
  if (!initialized || !productId) return;
  try {
    aa("clickedObjectIDs", {
      index: indexName,
      eventName: "Recommendation Clicked",
      objectIDs: [productId],
      ...(position !== undefined ? { positions: [position] } : {}),
    });
  } catch (error) {
    console.error("Algolia Insights failed to track a recommendation click", error);
  }
}
