import crypto from "node:crypto";
import { pool } from "../db/database.js";
import commerceAdapter from "../adapters/commerce/medusa.js";
import { trackAbandonedCart } from "../integrations/klaviyo/client.js";

export async function processAbandonedCart(input: {
  cartId: string;
  userId: string;
  email: string;
}) {
  const existing = await pool.query(
    `
    SELECT cart_id
    FROM abandoned_cart_events
    WHERE cart_id = $1
    `,
    [input.cartId]
  );

  if (existing.rowCount && existing.rowCount > 0) {
    return {
      status: "ALREADY_PROCESSED",
      cartId: input.cartId,
    };
  }

  const cart = await commerceAdapter.getCart(input.cartId);

  if (cart.items.length === 0) {
    return {
      status: "EMPTY_CART",
      cartId: input.cartId,
    };
  }

  const products = await commerceAdapter.listProducts();

  const items = [];

  for (const item of cart.items) {
    const product = (products as any[]).find((candidate) =>
      (candidate.variants ?? []).some(
        (variant: any) => variant.id === item.variant_id
      )
    );

    if (!product) {
      throw new Error(
        `PRODUCT_NOT_FOUND_FOR_VARIANT:${item.variant_id}`
      );
    }

    const variant = (product.variants ?? []).find(
      (candidate: any) => candidate.id === item.variant_id
    );

    const price =
      variant?.calculated_price?.calculated_amount ?? 0;

    items.push({
      productId: product.id,
      productName: product.title ?? product.name ?? "Product",
      quantity: item.quantity,
      price,
    });
  }

  const klaviyoEventId = crypto.randomUUID();

  await trackAbandonedCart({
    email: input.email,
    cartId: input.cartId,
    items,
    total: cart.total,
    currency: cart.currency_code.toUpperCase(),
    uniqueId: klaviyoEventId,
  });

  await pool.query(
    `
    INSERT INTO abandoned_cart_events (
      cart_id,
      user_id,
      email,
      detected_at,
      klaviyo_event_id,
      status
    )
    VALUES ($1, $2, $3, NOW(), $4, 'SENT')
    `,
    [
      input.cartId,
      input.userId,
      input.email,
      klaviyoEventId,
    ]
  );

  await pool.query(
    `
    INSERT INTO growth_audit_events (
      event_id,
      event,
      session_id,
      user_id,
      amount,
      currency,
      metadata,
      created_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
    `,
    [
      crypto.randomUUID(),
      "KLAVIYO_EVENT_CREATED",
      null,
      input.userId,
      cart.total,
      cart.currency_code.toUpperCase(),
      JSON.stringify({
        type: "ABANDONED_CART",
        cartId: input.cartId,
        itemCount: items.length,
        klaviyoEventId,
      }),
    ]
  );

  return {
    status: "SENT",
    cartId: input.cartId,
    klaviyoEventId,
  };
}