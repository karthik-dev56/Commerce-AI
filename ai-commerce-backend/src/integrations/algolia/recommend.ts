import { recommendClient } from "@algolia/recommend";

const appId = process.env.ALGOLIA_APP_ID;
const searchApiKey = process.env.ALGOLIA_SEARCH_API_KEY;
const indexName = process.env.ALGOLIA_INDEX_NAME || "products";

if (!appId) {
  throw new Error("ALGOLIA_APP_ID is not configured");
}

if (!searchApiKey) {
  throw new Error("ALGOLIA_SEARCH_API_KEY is not configured");
}

const client = recommendClient(appId, searchApiKey);

export async function getRelatedProducts(
  objectID: string,
  maxRecommendations = 6
) {
  const response = await client.getRecommendations({
    requests: [
      {
        indexName,
        model: "related-products",
        objectID,
        threshold: 0,
        maxRecommendations,
      },
    ],
  });

  return response.results[0]?.hits ?? [];
}