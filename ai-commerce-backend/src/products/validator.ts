import Ajv from "ajv";
import type { CanonicalProduct } from "./normalizer.js";
import { canonicalProductSchema } from "./schema.js";

const ajv = new Ajv({
  allErrors: true,
});

const validateProduct = ajv.compile<CanonicalProduct>(
  canonicalProductSchema
);

export function validateCanonicalProduct(
  product: CanonicalProduct
): boolean {
  const valid = validateProduct(product);

  if (!valid) {
    console.error(
      "Canonical product validation failed:",
      validateProduct.errors
    );

    return false;
  }

  return true;
}