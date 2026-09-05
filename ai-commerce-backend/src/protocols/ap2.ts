import crypto from "node:crypto";

export interface PaymentMandate {
  mandateId: string;
  sessionId: string;
  cartId: string;
  maxAmount: number;
  currency: string;
  purpose: "PURCHASE";
  status: "ACTIVE" | "USED" | "EXPIRED" | "REVOKED";
  createdAt: string;
  expiresAt: string;
}

const mandates = new Map<string, PaymentMandate>();

export function createPaymentMandate(input: {
  sessionId: string;
  cartId: string;
  maxAmount: number;
  currency: string;
}): PaymentMandate {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 15 * 60 * 1000);

  const mandate: PaymentMandate = {
    mandateId: crypto.randomUUID(),
    sessionId: input.sessionId,
    cartId: input.cartId,
    maxAmount: input.maxAmount,
    currency: input.currency,
    purpose: "PURCHASE",
    status: "ACTIVE",
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };

  mandates.set(mandate.mandateId, mandate);

  return mandate;
}

export function validatePaymentMandate(input: {
  mandateId: string;
  sessionId: string;
  cartId: string;
  amount: number;
}) {
  const mandate = mandates.get(input.mandateId);

  if (!mandate) {
    throw new Error("MANDATE_NOT_FOUND");
  }

  if (mandate.status !== "ACTIVE") {
    throw new Error("MANDATE_NOT_ACTIVE");
  }

  if (mandate.sessionId !== input.sessionId) {
    throw new Error("MANDATE_SESSION_MISMATCH");
  }

  if (mandate.cartId !== input.cartId) {
    throw new Error("MANDATE_CART_MISMATCH");
  }

  if (new Date() > new Date(mandate.expiresAt)) {
    mandate.status = "EXPIRED";
    throw new Error("MANDATE_EXPIRED");
  }

  if (input.amount > mandate.maxAmount) {
    throw new Error("AMOUNT_EXCEEDS_MANDATE");
  }

  return {
    mandate,
    mandateActive: mandate.status === "ACTIVE",
    cartMatchesMandate: mandate.cartId === input.cartId,
    amountWithinLimit: input.amount <= mandate.maxAmount,
  };
}

export function consumePaymentMandate(mandateId: string) {
  const mandate = mandates.get(mandateId);

  if (!mandate) {
    throw new Error("MANDATE_NOT_FOUND");
  }

  if (mandate.status !== "ACTIVE") {
    throw new Error("MANDATE_NOT_ACTIVE");
  }

  mandate.status = "USED";

  return mandate;
}

export function authorizePayment(input: {
  mandateId: string;
  sessionId: string;
  cartId: string;
  amount: number;
}) {
  const result = validatePaymentMandate(input);

  consumePaymentMandate(input.mandateId);

  return result.mandate;
}