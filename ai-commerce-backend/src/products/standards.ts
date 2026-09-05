import type { CanonicalProduct } from "./normalizer.js";

export interface StandardizedProduct {
  "@context": "https://schema.org";
  "@type": "Product";

  productID: string;
  name: string;
  description: string | null;

  brand?: {
    "@type": "Brand";
    name: string;
  };

  category: string | null;

  sku?: string;

  mpn?: string;

  gtin?: string;

  additionalProperty: {
    "@type": "PropertyValue";
    name: string;
    value: string | number | boolean;
  }[];

  offers: {
    "@type": "Offer";
    price: number;
    priceCurrency: string;
    availability: string;
    itemCondition: "https://schema.org/NewCondition";
  };

  image: string[];
}

/**
 * Convert our canonical commerce product into
 * an agent-readable Schema.org Product representation.
 *
 * GS1 concepts are represented through standardized
 * identifiers such as SKU, GTIN and MPN and through
 * structured product properties.
 */
export function toStandardizedProduct(
  product: CanonicalProduct
): StandardizedProduct {
  const standardized: StandardizedProduct = {
    "@context": "https://schema.org",
    "@type": "Product",

    productID: product.id,

    name: product.name,

    description: product.description,

    category: product.category,

    additionalProperty: Object.entries(
      product.attributes
    ).map(([name, value]) => ({
      "@type": "PropertyValue" as const,
      name,
      value:
        value === null
          ? ""
          : value,
    })),

    offers: {
      "@type": "Offer",

      price: product.price.amount,

      priceCurrency:
        product.price.currency.toUpperCase(),

      availability:
        product.availability === "InStock"
          ? "https://schema.org/InStock"
          : product.availability === "OutOfStock"
            ? "https://schema.org/OutOfStock"
            : "https://schema.org/ItemAvailability",

      itemCondition:
        "https://schema.org/NewCondition",
    },

    image: product.images,
  };

  if (product.brand) {
    standardized.brand = {
      "@type": "Brand",
      name: product.brand,
    };
  }

  if (product.identifiers.sku) {
    standardized.sku = product.identifiers.sku;
  }

  if (product.identifiers.mpn) {
    standardized.mpn = product.identifiers.mpn;
  }

  if (product.identifiers.gtin) {
    standardized.gtin = product.identifiers.gtin;
  }

  return standardized;
}