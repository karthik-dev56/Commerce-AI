import { algoliaClient, ALGOLIA_INDEX_NAME } from "./client.js";
import commerceAdapter from "../../adapters/commerce/medusa.js";
import type { CanonicalProduct } from "../../products/normalizer.js";
import { normalizeProduct } from "../../products/normalizer.js";

interface AlgoliaProductRecord {
  objectID: string;
  name: string;
  description: string | null;
  brand: string | null;
  category: string | null;
  productType: string | null;
  tags: string[];
  sku: string | null;
  gtin: string | null;
  mpn: string | null;
  price: number;
  currency: string;
  availability: string;
  inventory: number | null;
  attributes: Record<string, string | number | boolean | null>;
  images: string[];
  variants: CanonicalProduct["variants"];
  searchableText: string;
}

function toAlgoliaRecord(
  product: CanonicalProduct
): AlgoliaProductRecord {
  const searchableText = [
    product.name,
    product.description ?? "",
    product.brand ?? "",
    product.category ?? "",
    product.productType ?? "",
    ...product.tags,
    product.identifiers.sku ?? "",
    product.identifiers.gtin ?? "",
    product.identifiers.mpn ?? "",
    ...Object.entries(product.attributes).flatMap(
      ([key, value]) => [
        key,
        value === null ? "" : String(value),
      ]
    ),
  ]
    .filter(Boolean)
    .join(" ");

  return {
    objectID: product.id,
    name: product.name,
    description: product.description,
    brand: product.brand,
    category: product.category,
    productType: product.productType,
    tags: product.tags,
    sku: product.identifiers.sku,
    gtin: product.identifiers.gtin,
    mpn: product.identifiers.mpn,
    price: product.price.amount,
    currency: product.price.currency,
    availability: product.availability,
    inventory: product.inventory,
    attributes: product.attributes,
    images: product.images,
    variants: product.variants,
    searchableText,
  };
}

export async function syncCatalogToAlgolia(): Promise<{
  indexed: number;
}> {
  const products = await commerceAdapter.listProducts();

  const records: CanonicalProduct[] = [];

  for (const product of products) {
    const rawProduct = product as any;

    const inventoryItemIds: string[] = [];

    for (const variant of rawProduct.variants ?? []) {
      for (const inventoryItem of variant.inventory_items ?? []) {
        if (inventoryItem.inventory_item_id) {
          inventoryItemIds.push(inventoryItem.inventory_item_id);
        }
      }
    }

    let inventory: number | null = null;

    if (inventoryItemIds.length > 0) {
      const inventoryValues = await Promise.all(
        inventoryItemIds.map((inventoryItemId) =>
          commerceAdapter.getInventory(inventoryItemId)
        )
      );

      inventory = inventoryValues.reduce(
        (total, value) => total + value,
        0
      );
    }

    records.push(
      normalizeProduct(rawProduct, inventory)
    );
  }

  const algoliaRecords = records.map(toAlgoliaRecord);

  if (algoliaRecords.length === 0) {
    return {
      indexed: 0,
    };
  }

  await algoliaClient.saveObjects({
    indexName: ALGOLIA_INDEX_NAME,
    objects: algoliaRecords.map(
      (record) =>
        record as unknown as Record<string, unknown>
    ),
  });

  return {
    indexed: algoliaRecords.length,
  };
}