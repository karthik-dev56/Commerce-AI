import { apiRequest } from "./http";
import type { Cart, CheckoutSummary } from "@/types/commerce";

/**
 * Checkout is orchestrated by our backend:
 *   frontend -> backend -> Medusa (order) -> Razorpay (payment) -> backend -> frontend
 *
 * The frontend never computes or sends an amount, never talks to Razorpay with
 * credentials, and never marks an order as paid on its own. It only:
 *   1. asks the backend to create a Razorpay order for the current cart,
 *   2. hands that order to the Razorpay SDK,
 *   3. sends the provider handshake back for server-side verification.
 */

/** Razorpay order created server-side. Amount is authoritative (in paise). */
export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
}

export interface RazorpayHandshake {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export interface VerificationResult {
  verified: boolean;
  orderId?: string | undefined;
  message?: string | undefined;
  workflow?: { status?: string } | undefined;
}

function toSummary(cart: Cart): CheckoutSummary {
  return {
    items: cart.items,
    subtotal: cart.subtotal,
    shipping: cart.shipping,
    total: cart.total,
    currency: cart.currency,
    estimatedDelivery: "",
  };
}

/** Spend authorization granted by the shopper for the current cart. */
export interface PurchaseMandate {
  mandateId: string;
}

export interface MandateInput {
  sessionId: string;
  cartId: string;
  /** The backend cart total, echoed back for the authorization ceiling. */
  maxAmount: number;
  currency: string;
}

export const checkoutService = {
  summaryFromCart(cart: Cart): CheckoutSummary {
    return toSummary(cart);
  },

  /** Records the shopper's explicit consent before any payment can start. */
  async createMandate(input: MandateInput): Promise<PurchaseMandate> {
    const payload = await apiRequest<
      { success?: boolean; mandateId?: string; mandate?: { id?: string; mandateId?: string } }
    >("/authorization/mandate", {
      method: "POST",
      body: {
        sessionId: input.sessionId,
        cartId: input.cartId,
        maxAmount: input.maxAmount,
        currency: input.currency,
        consent: true,
      },
    });

    const mandateId = payload?.mandateId ?? payload?.mandate?.mandateId ?? payload?.mandate?.id;
    if (!mandateId) throw new Error("mandate_missing");
    return { mandateId };
  },

  /** Creates the payment order. No amount is ever sent from the browser. */
  async createOrder(cartId: string, mandateId: string, sessionId: string): Promise<RazorpayOrder> {
    const payload = await apiRequest<{ success?: boolean; order?: RazorpayOrder } & Partial<RazorpayOrder>>(
      "/checkout/create-order",
      { method: "POST", body: { cartId, mandateId, sessionId } },
    );
    const order = payload.order ?? (payload as RazorpayOrder);
    if (!order?.id) throw new Error("checkout_order_missing");
    return { id: order.id, amount: order.amount, currency: order.currency };
  },

  /** The backend verifies the provider signature and returns the final state. */
  async verifyPayment(
    cartId: string,
    handshake: RazorpayHandshake,
  ): Promise<VerificationResult> {
    const payload = await apiRequest<{
      verified?: boolean;
      success?: boolean;
      orderId?: string;
      order_id?: string;
      message?: string;
      workflow?: { status?: string };
    }>("/checkout/verify", {
      method: "POST",
      body: {
        cartId,
        razorpay_order_id: handshake.razorpay_order_id,
        razorpay_payment_id: handshake.razorpay_payment_id,
        razorpay_signature: handshake.razorpay_signature,
      },
    });

    return {
      verified: payload?.verified === true,
      orderId: payload?.orderId ?? payload?.order_id ?? handshake.razorpay_order_id,
      message: payload?.message,
      workflow: payload?.workflow,
    };
  },
};
