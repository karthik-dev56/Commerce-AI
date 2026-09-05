import { normalizeProduct } from "../products/normalizer.js";

export type ProductFamily =
  | "laptop"
  | "computer-accessory"
  | "clothing"
  | "footwear"
  | "television"
  | "audio"
  | "tablet"
  | "appliance"
  | "furniture"
  | "other";

export function getProductFamily(
  product: ReturnType<typeof normalizeProduct>
): ProductFamily {
  const text = [
    product.name,
    product.description ?? "",
    product.productType ?? "",
    product.category ?? "",
    ...product.tags,
  ]
    .join(" ")
    .toLowerCase();

  if (/\b(laptop|notebook|macbook|chromebook)\b/.test(text)) {
    return "laptop";
  }

  if (
    /\b(mouse|keyboard|webcam|headset|monitor|gaming mouse|gaming keyboard)\b/.test(
      text
    )
  ) {
    return "computer-accessory";
  }

  if (
    /\b(jeans|shirt|hoodie|t-shirt|jacket|dress|clothing|apparel)\b/.test(
      text
    )
  ) {
    return "clothing";
  }

  if (/\b(shoes|shoe|sneakers|running shoes|footwear)\b/.test(text)) {
    return "footwear";
  }

  if (/\b(tv|television|smart tv)\b/.test(text)) {
    return "television";
  }

  if (/\b(headphones|earbuds|airpods|speaker|audio)\b/.test(text)) {
    return "audio";
  }

  if (/\b(tablet|ipad)\b/.test(text)) {
    return "tablet";
  }

  if (
    /\b(air fryer|microwave|refrigerator|washing machine|appliance)\b/.test(
      text
    )
  ) {
    return "appliance";
  }

  if (
    /\b(chair|desk|table|shelf|storage|furniture)\b/.test(text)
  ) {
    return "furniture";
  }

  return "other";
}