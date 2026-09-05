import { Router } from "express";
import commerceAdapter from "../adapters/commerce/medusa.js";
import { pool } from "../db/database.js";

const router = Router();

async function recordCartActivity(cartId: string, req: any) {
  const userId = req.session?.userId;
  const email = req.session?.email?.trim().toLowerCase();

  if (!userId || !email) return;

  await pool.query(
    `
    INSERT INTO cart_activity (
      cart_id,
      user_id,
      email,
      last_activity_at,
      checkout_completed
    )
    VALUES ($1, $2, $3, NOW(), FALSE)
    ON CONFLICT (cart_id)
    DO UPDATE SET
      user_id = EXCLUDED.user_id,
      email = EXCLUDED.email,
      last_activity_at = NOW()
    `,
    [cartId, userId, email]
  );
}

router.post("/", async (req, res) => {
  try {
    const cart = await commerceAdapter.createCart();

    await recordCartActivity(cart.id, req);

    res.status(201).json({
      success: true,
      cart,
    });
  } catch (error) {
    console.error("Create cart failed:", error);

    res.status(500).json({
      success: false,
      error: "Failed to create cart",
    });
  }
});

router.get("/:cartId", async (req, res) => {
  try {
    const cart = await commerceAdapter.getCart(req.params.cartId);

    res.json({
      success: true,
      cart,
    });
  } catch (error) {
    console.error("Get cart failed:", error);

    res.status(404).json({
      success: false,
      error: "Cart not found",
    });
  }
});

router.post("/:cartId/items", async (req, res) => {
  try {
    const { variantId, quantity } = req.body;

    if (!variantId || typeof variantId !== "string") {
      return res.status(400).json({
        success: false,
        error: "variantId is required",
      });
    }

    if (
      typeof quantity !== "number" ||
      !Number.isInteger(quantity) ||
      quantity <= 0
    ) {
      return res.status(400).json({
        success: false,
        error: "quantity must be a positive integer",
      });
    }

    const cart = await commerceAdapter.addCartItem(
      req.params.cartId,
      variantId,
      quantity
    );

    await recordCartActivity(cart.id, req);

    res.status(201).json({
      success: true,
      cart,
    });
  } catch (error) {
    console.error("Add cart item failed:", error);

    res.status(400).json({
      success: false,
      error: "Failed to add item to cart",
    });
  }
});

router.patch("/:cartId/items/:lineItemId", async (req, res) => {
  try {
    const { quantity } = req.body;

    if (
      typeof quantity !== "number" ||
      !Number.isInteger(quantity) ||
      quantity <= 0
    ) {
      return res.status(400).json({
        success: false,
        error: "quantity must be a positive integer",
      });
    }

    const cart = await commerceAdapter.updateCartItem(
      req.params.cartId,
      req.params.lineItemId,
      quantity
    );

    await recordCartActivity(cart.id, req);

    res.json({
      success: true,
      cart,
    });
  } catch (error) {
    console.error("Update cart item failed:", error);

    res.status(400).json({
      success: false,
      error: "Failed to update cart item",
    });
  }
});

router.delete("/:cartId/items/:lineItemId", async (req, res) => {
  try {
    const cart = await commerceAdapter.removeCartItem(
      req.params.cartId,
      req.params.lineItemId
    );

    await recordCartActivity(cart.id, req);

    res.json({
      success: true,
      cart,
    });
  } catch (error) {
    console.error("Remove cart item failed:", error);

    res.status(400).json({
      success: false,
      error: "Failed to remove cart item",
    });
  }
});

export default router;