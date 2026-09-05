import { Router } from "express";
import {
  authorizePayment,
  createPaymentMandate,
} from "../protocols/ap2.js";

const router = Router();

router.post("/mandate", async (req, res) => {
  try {
    const {
      sessionId,
      cartId,
      maxAmount,
      currency,
      consent,
    } = req.body;

    if (
      !sessionId ||
      !cartId ||
      typeof maxAmount !== "number" ||
      maxAmount <= 0 ||
      consent !== true
    ) {
      return res.status(400).json({
        success: false,
        error: "Explicit customer consent is required",
      });
    }

    const mandate = createPaymentMandate({
      sessionId,
      cartId,
      maxAmount,
      currency: currency || "INR",
    });

    return res.status(201).json({
      success: true,
      consent: true,
      mandate,
    });
  } catch (error) {
    console.error("Mandate creation failed:", error);

    return res.status(500).json({
      success: false,
      error: "Failed to create payment mandate",
    });
  }
});

router.post("/authorize-payment", async (req, res) => {
  try {
    const {
      mandateId,
      sessionId,
      cartId,
      amount,
    } = req.body;

    if (
      !mandateId ||
      !sessionId ||
      !cartId ||
      typeof amount !== "number"
    ) {
      return res.status(400).json({
        success: false,
        authorized: false,
        error: "Invalid authorization request",
      });
    }

    const mandate = authorizePayment({
      mandateId,
      sessionId,
      cartId,
      amount,
    });

    return res.json({
      success: true,
      authorized: true,
      mandateId: mandate.mandateId,
      maxAmount: mandate.maxAmount,
      amount,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "AUTHORIZATION_FAILED";

    return res.status(403).json({
      success: false,
      authorized: false,
      error: message,
    });
  }
});

export default router;