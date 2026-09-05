import { Router } from "express";
import commerceAdapter from "../adapters/commerce/medusa.js";
import { razorpay } from "../integrations/razorpay/client.js";
import { verifyRazorpaySignature } from "../integrations/razorpay/verify.js";
import {
  validatePaymentMandate,
  consumePaymentMandate,
} from "../protocols/ap2.js";
import { authorizePaymentWithCedar } from "../authorization/cedar.js";
import { executePaymentWorkflow } from "../workflows/paymentWorkflow.js";
import { pool } from "../db/database.js";

const router = Router();

router.post("/create-order", async (req, res) => {
  try {
    const { cartId, mandateId, sessionId } = req.body;

    if (!cartId || !mandateId || !sessionId) {
      return res.status(400).json({
        success: false,
        error: "cartId, mandateId and sessionId are required",
      });
    }

    const cart = await commerceAdapter.getCart(cartId);

    if (!cart.items.length) {
      return res.status(400).json({
        success: false,
        error: "Cart is empty",
      });
    }

    const amount = cart.total;

    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        error: "Invalid cart total",
      });
    }

    const mandateValidation = validatePaymentMandate({
      mandateId,
      sessionId,
      cartId,
      amount,
    });

    const cedarAllowed = await authorizePaymentWithCedar({
      mandateActive: mandateValidation.mandateActive,
      cartMatchesMandate: mandateValidation.cartMatchesMandate,
      amountWithinLimit: mandateValidation.amountWithinLimit,
    });

    if (!cedarAllowed) {
      return res.status(403).json({
        success: false,
        error: "Cedar authorization denied",
      });
    }

    consumePaymentMandate(mandateId);

    const razorpayAmount = Math.round(amount * 100);

    const order = await razorpay.orders.create({
      amount: razorpayAmount,
      currency: cart.currency_code.toUpperCase(),
      receipt: `cart_${cartId}`,
      notes: {
        cart_id: cartId,
        mandate_id: mandateId,
      },
    });

    return res.status(201).json({
      success: true,
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
      },
    });
  } catch (error: any) {
    console.error(
      "Razorpay order creation failed:",
      JSON.stringify(error, null, 2)
    );

    return res.status(403).json({
      success: false,
      error:
        error?.error?.description ||
        error?.message ||
        "Payment authorization failed",
    });
  }
});

router.post("/verify", async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      cartId,
    } = req.body;

    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature ||
      !cartId
    ) {
      return res.status(400).json({
        success: false,
        verified: false,
        error: "Missing payment verification fields",
      });
    }

    const verified = verifyRazorpaySignature({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
    });

    if (!verified) {
      return res.status(400).json({
        success: false,
        verified: false,
        error: "Invalid Razorpay signature",
      });
    }

    const workflow = await executePaymentWorkflow({
      cartId,
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
    });

    if (workflow.status === "FAILED") {
      return res.status(500).json({
        success: false,
        verified: true,
        status: "WORKFLOW_FAILED",
        workflow,
      });
    }

    await pool.query(
      `
      UPDATE cart_activity
      SET checkout_completed = TRUE
      WHERE cart_id = $1
      `,
      [cartId]
    );

    return res.json({
      success: true,
      verified: true,
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      status: "PAYMENT_VERIFIED",
      workflow,
    });
  } catch (error) {
    console.error("Payment verification failed:", error);

    return res.status(500).json({
      success: false,
      verified: false,
      error: "Payment verification failed",
    });
  }
});

export default router;