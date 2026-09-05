import { algoliasearch } from "algoliasearch";

const appId = process.env.ALGOLIA_APP_ID;
const writeApiKey = process.env.ALGOLIA_WRITE_API_KEY;
const searchApiKey = process.env.ALGOLIA_SEARCH_API_KEY;
const indexName = process.env.ALGOLIA_INDEX_NAME || "products";

if (!appId) {
  throw new Error("ALGOLIA_APP_ID is not configured");
}

if (!writeApiKey) {
  throw new Error("ALGOLIA_WRITE_API_KEY is not configured");
}

if (!searchApiKey) {
  throw new Error("ALGOLIA_SEARCH_API_KEY is not configured");
}

export const algoliaClient = algoliasearch(
  appId,
  writeApiKey
);

export const algoliaSearchClient = algoliasearch(
  appId,
  searchApiKey
);

export const ALGOLIA_INDEX_NAME = indexName;