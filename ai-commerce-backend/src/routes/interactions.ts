import { Router } from "express";
import crypto from "node:crypto";
import { pool } from "../db/database.js";

const router = Router();

const ALLOWED_EVENTS = [
  "VIEW",
  "SEARCH",
  "ADD_TO_CART",
  "PURCHASE",
  "WISHLIST",
] as const;

type EventType = (typeof ALLOWED_EVENTS)[number];

router.post("/", async (req, res) => {
  try {
    const userId = req.session.userId;

    if (!userId) {
      return res.status(401).json({
        error: "Authentication required",
      });
    }

    const {
      productId,
      eventType,
      eventValue,
      context,
      sessionId,
    } = req.body;

    if (!productId || typeof productId !== "string") {
      return res.status(400).json({
        error: "productId is required",
      });
    }

    if (
      !eventType ||
      !ALLOWED_EVENTS.includes(eventType as EventType)
    ) {
      return res.status(400).json({
        error: "Invalid eventType",
        allowedEvents: ALLOWED_EVENTS,
      });
    }

    const eventId = crypto.randomUUID();

    const result = await pool.query(
      `
      INSERT INTO interactions (
        event_id,
        user_id,
        session_id,
        product_id,
        event_type,
        event_value,
        context
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING
        id,
        event_id,
        user_id,
        session_id,
        product_id,
        event_type,
        event_value,
        context,
        created_at
      `,
      [
        eventId,
        userId,
        sessionId ?? null,
        productId,
        eventType,
        eventValue ?? null,
        context ?? null,
      ]
    );

    res.status(201).json({
      interaction: result.rows[0],
    });
  } catch (error) {
    console.error(
      "Interaction recording failed:",
      error
    );

    res.status(500).json({
      error: "Failed to record interaction",
    });
  }
});

router.get("/me", async (req, res) => {
  try {
    const userId = req.session.userId;

    if (!userId) {
      return res.status(401).json({
        error: "Authentication required",
      });
    }

    const result = await pool.query(
      `
      SELECT
        id,
        event_id,
        session_id,
        product_id,
        event_type,
        event_value,
        context,
        created_at
      FROM interactions
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 100
      `,
      [userId]
    );

    res.json({
      interactions: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    console.error(
      "Interaction history request failed:",
      error
    );

    res.status(500).json({
      error: "Failed to fetch interaction history",
    });
  }
});

export default router;