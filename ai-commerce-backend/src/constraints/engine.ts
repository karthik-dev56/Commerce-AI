import type { CanonicalProduct } from "../products/normalizer.js";

export interface ShoppingConstraints {
  maxPrice?: number;
  minPrice?: number;
  category?: string;
  keywords?: string[];
  inStockOnly?: boolean;
}


function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Build searchable product terms from authoritative
 * normalized commerce data.
 */
function getProductTokens(
  product: CanonicalProduct
): Set<string> {
  const values: string[] = [
    product.name,
    product.description ?? "",
    product.category ?? "",
    product.identifiers.sku ?? "",
  ];

  for (const [key, value] of Object.entries(
    product.attributes
  )) {
    values.push(key);

    if (value !== null) {
      values.push(String(value));
    }
  }

  for (const variant of product.variants) {
    values.push(variant.title);

    for (const [key, value] of Object.entries(
      variant.options
    )) {
      values.push(key);
      values.push(value);
    }

    if (variant.sku) {
      values.push(variant.sku);
    }
  }

  return new Set(
    values.flatMap(tokenize)
  );
}

function matchesKeyword(
  productTokens: Set<string>,
  keyword: string
): boolean {
  const keywordTokens = tokenize(keyword);

  if (keywordTokens.length === 0) {
    return true;
  }

  return keywordTokens.every(
    (token) => productTokens.has(token)
  );
}

export function applyConstraints(
  products: CanonicalProduct[],
  constraints: ShoppingConstraints
): CanonicalProduct[] {
  return products.filter((product) => {

    if (
      constraints.maxPrice !== undefined &&
      product.price.amount >
        constraints.maxPrice
    ) {
      return false;
    }

    if (
      constraints.minPrice !== undefined &&
      product.price.amount <
        constraints.minPrice
    ) {
      return false;
    }


    if (constraints.category) {
      const productCategory =
        product.category?.trim().toLowerCase();

      const requestedCategory =
        constraints.category.trim().toLowerCase();

      if (
        productCategory !==
        requestedCategory
      ) {
        return false;
      }
    }

    if (constraints.inStockOnly) {
      if (
        product.availability !== "InStock" ||
        product.inventory === null ||
        product.inventory <= 0
      ) {
        return false;
      }
    }


    if (
      constraints.keywords &&
      constraints.keywords.length > 0
    ) {
      const productTokens =
        getProductTokens(product);

      const allKeywordsMatch =
        constraints.keywords.every(
          (keyword) =>
            matchesKeyword(
              productTokens,
              keyword
            )
        );

      if (!allKeywordsMatch) {
        return false;
      }
    }

    return true;
  });
}