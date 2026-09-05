import { Router } from "express";
import crypto from "node:crypto";
import { trackAbandonedCart } from "../integrations/klaviyo/client.js";
import { pool } from "../db/database.js";

const router = Router();

router.post("/events/abandoned-cart", async (req, res) => {
  const userId = (req.session as any)?.userId;
  const email = (req.session as any)?.email?.trim().toLowerCase();

  if (!userId || !email) {
    return res.status(401).json({
      success: false,
      error: "AUTHENTICATION_REQUIRED",
    });
  }

  const { cartId, items, total, currency } = req.body;

  if (
    !cartId ||
    !Array.isArray(items) ||
    typeof total !== "number" ||
    !currency
  ) {
    return res.status(400).json({
      success: false,
      error: "INVALID_ABANDONED_CART_PAYLOAD",
    });
  }

  const uniqueId = crypto.randomUUID();

  try {
    const result = await trackAbandonedCart({
      email,
      cartId,
      items,
      total,
      currency,
      uniqueId,
    });

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
        req.sessionID,
        userId,
        total,
        currency,
        JSON.stringify({
          type: "ABANDONED_CART",
          cartId,
          itemCount: items.length,
          klaviyoStatus: result.status,
          uniqueId,
        }),
      ]
    );

    return res.status(202).json({
      success: true,
      status: "KLAVIYO_EVENT_ACCEPTED",
      klaviyoStatus: result.status,
      cartId,
      uniqueId,
    });
  } catch (error) {
    console.error("Klaviyo abandoned-cart event failed:", error);

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
        "KLAVIYO_EVENT_FAILED",
        req.sessionID,
        userId,
        total,
        currency,
        JSON.stringify({
          type: "ABANDONED_CART",
          cartId,
          error:
            error instanceof Error
              ? error.message
              : "Unknown Klaviyo error",
        }),
      ]
    );

    if (
      error instanceof Error &&
      error.message === "KLAVIYO_NOT_CONFIGURED"
    ) {
      return res.status(503).json({
        success: false,
        error: "KLAVIYO_NOT_CONFIGURED",
      });
    }

    return res.status(502).json({
      success: false,
      error: "KLAVIYO_EVENT_FAILED",
    });
  }
});

export default router;