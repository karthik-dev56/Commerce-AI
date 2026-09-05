import { Router } from "express";
import commerceAdapter from "../adapters/commerce/medusa.js";
import { normalizeProduct } from "../products/normalizer.js";
import { validateCanonicalProduct } from "../products/validator.js";
import { toStandardizedProduct } from "../products/standards.js";
import {
  applyConstraints,
  type ShoppingConstraints,
} from "../constraints/engine.js";
import { extractShoppingIntent } from "../intent/gemini.js";

const router = Router();

async function normalizeAndValidateProduct(product: unknown) {
  const typedProduct =
    product as Parameters<typeof normalizeProduct>[0];

  const inventoryItemId =
    (typedProduct.variants?.[0] as any)?.inventory_items?.[0]
      ?.inventory_item_id ?? null;

  const inventory = inventoryItemId
    ? await commerceAdapter.getInventory(inventoryItemId)
    : null;

  // 1. Normalize Medusa product
  const normalizedProduct = normalizeProduct(
    typedProduct,
    inventory
  );

  // 2. Validate canonical product
  if (!validateCanonicalProduct(normalizedProduct)) {
    throw new Error(
      `Invalid canonical product: ${normalizedProduct.id}`
    );
  }

  // 3. Convert to Schema.org / GS1-style representation
  const standardizedProduct =
    toStandardizedProduct(normalizedProduct);

  return {
    canonical: normalizedProduct,
    standardized: standardizedProduct,
  };
}


router.get("/", async (_req, res) => {
  try {
    const rawProducts =
      await commerceAdapter.listProducts();

    const products = await Promise.all(
      rawProducts.map(normalizeAndValidateProduct)
    );

    res.json({
      products,
      count: products.length,
    });
  } catch (error) {
    console.error(
      "Commerce product request failed:",
      error
    );

    res.status(500).json({
      error: "Failed to fetch products",
    });
  }
});


router.post("/search", async (req, res) => {
  try {
    const rawProducts =
      await commerceAdapter.listProducts();

    const productRecords = await Promise.all(
      rawProducts.map(normalizeAndValidateProduct)
    );

    // Constraints operate on canonical products
    const products = productRecords.map(
      (record) => record.canonical
    );

    const constraints =
      req.body as ShoppingConstraints;

    const filteredProducts = applyConstraints(
      products,
      constraints
    );

    res.json({
      products: filteredProducts,
      count: filteredProducts.length,
      constraints,
    });
  } catch (error) {
    console.error(
      "Product constraint search failed:",
      error
    );

    res.status(500).json({
      error: "Failed to search products",
    });
  }
});


router.post("/intent", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({
        error: "message is required",
      });
    }

    const intent =
      await extractShoppingIntent(message);

    res.json({
      intent,
    });
  } catch (error) {
    console.error(
      "Shopping intent extraction failed:",
      error
    );

    res.status(500).json({
      error: "Failed to understand shopping request",
    });
  }
});



router.post("/smart-search", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({
        error: "message is required",
      });
    }

    const intent =
      await extractShoppingIntent(message);

    const rawProducts =
      await commerceAdapter.listProducts();

    const productRecords = await Promise.all(
      rawProducts.map(normalizeAndValidateProduct)
    );

    const products = productRecords.map(
      (record) => record.canonical
    );

    const constraints: ShoppingConstraints = {
      maxPrice: intent.maxPrice ?? undefined,
      minPrice: intent.minPrice ?? undefined,
      category: intent.category ?? undefined,
      keywords: intent.keywords,
      inStockOnly: intent.inStockOnly,
    };

    const validProducts = applyConstraints(
      products,
      constraints
    );

    const validProductIds = new Set(
      validProducts.map((product) => product.id)
    );

    const standardizedProducts =
      productRecords
        .filter((record) =>
          validProductIds.has(record.canonical.id)
        )
        .map((record) => record.standardized);

    res.json({
      message,
      intent,
      constraints,

      // Canonical commerce data
      products: validProducts,

      // Agent-readable standardized data
      standardizedProducts,

      count: validProducts.length,
    });
  } catch (error) {
    console.error(
      "Smart product search failed:",
      error
    );

    res.status(500).json({
      error: "Failed to process shopping request",
    });
  }
});


router.get("/:productId", async (req, res) => {
  try {
    const product =
      await commerceAdapter.getProduct(
        req.params.productId
      );

    const productRecord =
      await normalizeAndValidateProduct(product);

    res.json({
      product: productRecord.canonical,
      standardizedProduct:
        productRecord.standardized,
    });
  } catch (error) {
    console.error(
      "Commerce product request failed:",
      error
    );

    res.status(500).json({
      error: "Failed to fetch product",
    });
  }
});


export default router;