import { Router } from "express";
import { pool } from "../db/database.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const {
      offerId,
      userId,
      limit = "100",
    } = req.query;

    const values: unknown[] = [];
    const conditions: string[] = [];

    if (offerId) {
      values.push(offerId);
      conditions.push(`offer_id = $${values.length}`);
    }

    if (userId) {
      values.push(userId);
      conditions.push(`user_id = $${values.length}`);
    }

    const parsedLimit = Math.min(
      Math.max(Number(limit) || 100, 1),
      500
    );

    values.push(parsedLimit);

    const whereClause =
      conditions.length > 0
        ? `WHERE ${conditions.join(" AND ")}`
        : "";

    const result = await pool.query(
      `
        SELECT
          event_id,
          event,
          offer_id,
          session_id,
          user_id,
          product_id,
          recommended_product_id,
          action,
          reason,
          amount,
          currency,
          metadata,
          created_at
        FROM growth_audit_events
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${values.length}
      `,
      values
    );

    return res.json({
      success: true,
      count: result.rows.length,
      events: result.rows,
    });
  } catch (error) {
    console.error("Growth audit retrieval failed:", error);

    return res.status(500).json({
      success: false,
      error: "Unable to retrieve growth audit",
    });
  }
});

export default router;