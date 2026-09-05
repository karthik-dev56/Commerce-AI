import type { Inventory, Product, ProductVariant, ProductSpecification } from "@/types/commerce";

/**
 * Maps the AI Commerce Backend (`/products`) canonical payload into the
 * storefront `Product` type.
 *
 * Only fields the backend actually supplies are populated. Ratings, review
 * counts, popularity, discounts, tags, shipping copy and images are never
 * fabricated here — when the backend omits them the UI hides them.
 */

export interface BackendPrice {
  amount?: number | null;
  currency?: string | null;
}

export interface BackendVariant {
  id?: string | null;
  title?: string | null;
  sku?: string | null;
  price?: BackendPrice | number | null;
  inventory?: number | null;
  availability?: string | null;
  options?: Record<string, unknown> | null;
}

export interface BackendCanonicalProduct {
  id: string;
  name?: string | null;
  title?: string | null;
  description?: string | null;
  brand?: string | null;
  category?: string | null;
  identifiers?: { sku?: string | null; gtin?: string | null; mpn?: string | null } | null;
  attributes?: Record<string, unknown> | null;
  price?: BackendPrice | null;
  availability?: string | null;
  inventory?: number | null;
  images?: (string | { url?: string | null })[] | null;
  variants?: BackendVariant[] | null;
}

export interface BackendProductEnvelope {
  canonical?: BackendCanonicalProduct;
  standardized?: Record<string, unknown>;
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function priceAmount(price: BackendPrice | number | null | undefined): number {
  if (typeof price === "number") return price;
  return typeof price?.amount === "number" ? price.amount : 0;
}

function toInventory(availability?: string | null, quantity?: number | null): Inventory {
  const normalized = (availability ?? "").toLowerCase().replace(/[^a-z]/g, "");
  let status: Inventory["status"];
  if (normalized.includes("outofstock") || normalized.includes("soldout")) {
    status = "out_of_stock";
  } else if (normalized.includes("limited") || normalized.includes("backorder")) {
    status = "low_stock";
  } else if (normalized.includes("instock") || normalized.includes("available")) {
    status = typeof quantity === "number" && quantity > 0 && quantity <= 5 ? "low_stock" : "in_stock";
  } else {
    status = typeof quantity === "number" ? (quantity > 0 ? "in_stock" : "out_of_stock") : "in_stock";
  }
  return {
    status,
    ...(typeof quantity === "number" ? { quantity } : {}),
  };
}

function toImages(images: BackendCanonicalProduct["images"]): string[] {
  if (!Array.isArray(images)) return [];
  return images
    .map((image) => (typeof image === "string" ? image : (image?.url ?? "")))
    .filter((url): url is string => typeof url === "string" && url.trim().length > 0);
}

function toSpecifications(canonical: BackendCanonicalProduct): ProductSpecification[] {
  const specs: ProductSpecification[] = [];
  const attributes = canonical.attributes ?? {};
  for (const [label, value] of Object.entries(attributes)) {
    if (value === null || value === undefined || typeof value === "object") continue;
    specs.push({ label: prettyLabel(label), value: String(value) });
  }
  const sku = canonical.identifiers?.sku;
  if (sku) specs.push({ label: "SKU", value: sku });
  return specs;
}

function prettyLabel(key: string): string {
  return key
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (char) => char.toUpperCase());
}

function toVariants(canonical: BackendCanonicalProduct, fallbackPrice: number): ProductVariant[] {
  const inventory = toInventory(canonical.availability, canonical.inventory);
  const source = Array.isArray(canonical.variants) ? canonical.variants : [];

  if (source.length === 0) {
    return [
      {
        id: canonical.id,
        title: "Default",
        optionName: "Option",
        price: fallbackPrice,
        inventory,
        ...(canonical.identifiers?.sku ? { sku: canonical.identifiers.sku } : {}),
      },
    ];
  }

  return source.map((variant, index) => {
    const price = priceAmount(variant.price ?? null) || fallbackPrice;
    return {
      id: variant.id ?? `${canonical.id}_variant_${index}`,
      title: variant.title ?? `Option ${index + 1}`,
      optionName: "Option",
      price,
      inventory: toInventory(variant.availability ?? canonical.availability, variant.inventory),
      ...(variant.sku ? { sku: variant.sku } : {}),
    };
  });
}

export function mapBackendProduct(canonical: BackendCanonicalProduct): Product {
  const description = canonical.description ?? "";
  const categoryName = canonical.category ?? "Uncategorised";
  const price = priceAmount(canonical.price);
  const variants = toVariants(canonical, price);
  const lowestVariantPrice = variants.reduce(
    (lowest, variant) => (variant.price > 0 && variant.price < lowest ? variant.price : lowest),
    price || Number.POSITIVE_INFINITY,
  );

  return {
    id: canonical.id,
    handle: canonical.id,
    title: canonical.name ?? canonical.title ?? "Untitled product",
    categorySlug: slugify(categoryName),
    categoryName,
    shortDescription: description.length > 140 ? `${description.slice(0, 137)}…` : description,
    description,
    price: Number.isFinite(lowestVariantPrice) ? lowestVariantPrice : price,
    currency: "INR",
    images: toImages(canonical.images),
    variants,
    inventory: toInventory(canonical.availability, canonical.inventory),
    specifications: toSpecifications(canonical),
    tags: [],
    ...(canonical.brand ? { brand: canonical.brand } : {}),
  };
}

/** Accepts either `{ canonical }` envelopes or bare canonical objects. */
export function unwrapProduct(entry: unknown): Product | null {
  if (!entry || typeof entry !== "object") return null;
  const envelope = entry as BackendProductEnvelope &
    BackendCanonicalProduct & { product?: unknown };
  if (envelope.product && typeof envelope.product === "object" && !envelope.canonical) {
    return unwrapProduct(envelope.product);
  }
  const canonical = envelope.canonical ?? (typeof envelope.id === "string" ? envelope : null);
  if (!canonical?.id) return null;
  return mapBackendProduct(canonical);
}

export function unwrapProducts(payload: unknown): Product[] {
  const list = Array.isArray(payload)
    ? payload
    : Array.isArray((payload as { products?: unknown })?.products)
      ? ((payload as { products: unknown[] }).products)
      : Array.isArray((payload as { results?: unknown })?.results)
        ? ((payload as { results: unknown[] }).results)
        : Array.isArray((payload as { recommendations?: unknown })?.recommendations)
          ? ((payload as { recommendations: unknown[] }).recommendations)
          : [];
  return list.map(unwrapProduct).filter((product): product is Product => product !== null);
}
