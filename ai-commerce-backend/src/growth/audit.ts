import crypto from "node:crypto";
import { pool } from "../db/database.js";

export type GrowthAuditEvent =
  | "GROWTH_RECOMMENDATION"
  | "GROWTH_OFFER_CREATED"
  | "GROWTH_OFFER_ACCEPTED"
  | "GROWTH_OFFER_DECLINED"
  | "GROWTH_CART_MUTATION"
  | "GROWTH_FAILURE";

export async function recordGrowthAudit(input: {
  event: GrowthAuditEvent;
  offerId?: string;
  sessionId?: string;
  userId?: string;
  productId?: string;
  recommendedProductId?: string;
  action?: string;
  reason?: string;
  amount?: number;
  currency?: string;
  metadata?: Record<string, unknown>;
}) {
  const eventId = crypto.randomUUID();

  await pool.query(
    `
      INSERT INTO growth_audit_events (
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
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        $9,
        $10,
        $11,
        $12,
        NOW()
      )
    `,
    [
      eventId,
      input.event,
      input.offerId ?? null,
      input.sessionId ?? null,
      input.userId ?? null,
      input.productId ?? null,
      input.recommendedProductId ?? null,
      input.action ?? null,
      input.reason ?? null,
      input.amount ?? null,
      input.currency ?? null,
      JSON.stringify(input.metadata ?? {}),
    ]
  );

  return eventId;
}