export interface CanonicalProduct {
  id: string;
  name: string;
  description: string | null;

  brand: string | null;

  category: string | null;
  productType: string | null;
  tags: string[];

  identifiers: {
    sku: string | null;
    gtin: string | null;
    mpn: string | null;
  };

  attributes: Record<string, string | number | boolean | null>;

  price: {
    amount: number;
    currency: string;
  };

  availability: "InStock" | "OutOfStock" | "Unknown";

  inventory: number | null;

  images: string[];

  variants: {
    id: string;
    sku: string | null;
    title: string;
    options: Record<string, string>;
  }[];
}

type MedusaProduct = {
  id: string;
  title: string;
  description?: string | null;
  thumbnail?: string | null;

  type?: {
    id?: string;
    value?: string | null;
  } | null;

  categories?: {
    id: string;
    name: string;
    handle?: string;
  }[];

  tags?: {
    id: string;
    value: string;
  }[];

  metadata?: Record<string, unknown> | null;

  images?: {
    url: string;
  }[];

  variants?: {
    id: string;
    sku?: string | null;
    title: string;

    calculated_price?: {
      calculated_amount: number;
      currency_code: string;
    } | null;

    options?: {
      value: string;
      option?: {
        title: string;
      } | null;
    }[];
  }[];
};

export function normalizeProduct(
  product: MedusaProduct,
  inventory: number | null = null
): CanonicalProduct {
  const firstVariant = product.variants?.[0];

  const availability: CanonicalProduct["availability"] =
    inventory === null
      ? "Unknown"
      : inventory > 0
        ? "InStock"
        : "OutOfStock";

  const attributes: Record<
    string,
    string | number | boolean | null
  > = {};

  for (const variant of product.variants ?? []) {
    for (const option of variant.options ?? []) {
      const key = option.option?.title;

      if (key) {
        attributes[key] = option.value;
      }
    }
  }

  const tags =
    product.tags
      ?.map((tag) => tag.value)
      .filter(Boolean) ?? [];

  const categories =
    product.categories
      ?.map((category) => category.name)
      .filter(Boolean) ?? [];

  const productType =
    product.type?.value ??
    (typeof product.metadata?.productType === "string"
      ? product.metadata.productType
      : null);

  const category =
    categories[0] ??
    product.type?.value ??
    (typeof product.metadata?.category === "string"
      ? product.metadata.category
      : null);

  return {
    id: product.id,

    name: product.title,

    description: product.description ?? null,

    brand:
      typeof product.metadata?.brand === "string"
        ? product.metadata.brand
        : null,

    category,

    productType,

    tags,

    identifiers: {
      sku: firstVariant?.sku ?? null,

      gtin:
        typeof product.metadata?.gtin === "string"
          ? product.metadata.gtin
          : null,

      mpn:
        typeof product.metadata?.mpn === "string"
          ? product.metadata.mpn
          : null,
    },

    attributes,

    price: {
      amount:
        firstVariant?.calculated_price?.calculated_amount ?? 0,

      currency:
        firstVariant?.calculated_price?.currency_code ?? "INR",
    },

    availability,

    inventory,

    images: [
      ...(product.thumbnail ? [product.thumbnail] : []),
      ...(product.images?.map((image) => image.url) ?? []),
    ],

    variants:
      product.variants?.map((variant) => ({
        id: variant.id,

        sku: variant.sku ?? null,

        title: variant.title,

        options: Object.fromEntries(
          variant.options?.map((option) => [
            option.option?.title ?? "Option",
            option.value,
          ]) ?? []
        ),
      })) ?? [],
  };
}