import { pool } from "../db/database.js";
import { processAbandonedCart } from "../services/abandonedCart.js";

let running = false;

export async function runAbandonedCartWorker() {
  if (running) return;

  running = true;

  try {
    const result = await pool.query(
      `
      SELECT
        cart_id,
        user_id,
        email
      FROM cart_activity
      WHERE last_activity_at <= NOW() - INTERVAL '30 minutes'
        AND checkout_completed = FALSE
      ORDER BY last_activity_at ASC
      LIMIT 50
      `
    );

    for (const cart of result.rows) {
      try {
        await processAbandonedCart({
          cartId: cart.cart_id,
          userId: cart.user_id,
          email: cart.email,
        });
      } catch (error) {
        console.error(
          `Abandoned cart processing failed for ${cart.cart_id}:`,
          error
        );
      }
    }
  } finally {
    running = false;
  }
}