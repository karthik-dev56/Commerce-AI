import { Router } from "express";
import { pool } from "../db/database.js";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) FILTER (
          WHERE event = 'GROWTH_OFFER_CREATED'
        ) AS total_offers,

        COUNT(*) FILTER (
          WHERE event = 'GROWTH_OFFER_ACCEPTED'
        ) AS accepted_offers,

        COUNT(*) FILTER (
          WHERE event = 'GROWTH_OFFER_DECLINED'
        ) AS declined_offers,

        COUNT(*) FILTER (
          WHERE event = 'GROWTH_FAILURE'
        ) AS failures,

        COUNT(*) FILTER (
          WHERE event = 'GROWTH_OFFER_CREATED'
          AND action = 'UPSELL'
        ) AS upsells,

        COUNT(*) FILTER (
          WHERE event = 'GROWTH_OFFER_CREATED'
          AND action = 'CROSS_SELL'
        ) AS cross_sells,

        COUNT(*) FILTER (
          WHERE event = 'GROWTH_OFFER_CREATED'
          AND action = 'BUNDLE'
        ) AS bundles,

        COALESCE(
          SUM(amount) FILTER (
            WHERE event = 'GROWTH_OFFER_ACCEPTED'
          ),
          0
        ) AS revenue_influenced

      FROM growth_audit_events
    `);

    const row = result.rows[0];

    const totalOffers = Number(row.total_offers);
    const acceptedOffers = Number(row.accepted_offers);

    const acceptanceRate =
      totalOffers > 0
        ? Number(
            ((acceptedOffers / totalOffers) * 100).toFixed(2)
          )
        : 0;

    return res.json({
      success: true,
      analytics: {
        totalOffers,
        acceptedOffers,
        declinedOffers: Number(row.declined_offers),
        failures: Number(row.failures),
        upsells: Number(row.upsells),
        crossSells: Number(row.cross_sells),
        bundles: Number(row.bundles),
        acceptanceRate,
        revenueInfluenced: Number(row.revenue_influenced),
        currency: "INR",
      },
    });
  } catch (error) {
    console.error("Growth analytics failed:", error);

    return res.status(500).json({
      success: false,
      error: "Unable to retrieve growth analytics",
    });
  }
});

export default router;