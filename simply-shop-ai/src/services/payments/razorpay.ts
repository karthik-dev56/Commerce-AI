import type { RazorpayOrder, RazorpayHandshake } from "../api/checkout";

/**
 * Payment provider adapter.
 *
 * Everything sensitive (key secret, order creation, signature verification)
 * lives in the backend. This adapter only:
 *   - loads the provider SDK on demand,
 *   - opens the provider's own payment UI with the backend-issued order,
 *   - returns the provider's response so the backend can verify it.
 */

export const RAZORPAY_KEY_ID: string =
  (import.meta.env["VITE_RAZORPAY_KEY_ID"] as string | undefined) ?? "";

export type PaymentAttempt =
  | { status: "success"; handshake: RazorpayHandshake }
  | { status: "dismissed" }
  | { status: "failed"; message: string };

interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

type RazorpayInstance = { open: () => void; on?: (event: string, cb: (payload: unknown) => void) => void };
type RazorpayConstructor = new (options: Record<string, unknown>) => RazorpayInstance;

function loadSdk(): Promise<RazorpayConstructor> {
  return new Promise((resolve, reject) => {
    const existing = (window as unknown as { Razorpay?: RazorpayConstructor }).Razorpay;
    if (existing) return resolve(existing);

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => {
      const ctor = (window as unknown as { Razorpay?: RazorpayConstructor }).Razorpay;
      if (ctor) resolve(ctor);
      else reject(new Error("payment_sdk_unavailable"));
    };
    script.onerror = () => reject(new Error("payment_sdk_unavailable"));
    document.body.appendChild(script);
  });
}

export interface PaymentCustomer {
  name: string;
  phone: string;
  email?: string | undefined;
}

/** Opens Razorpay Standard Checkout for a backend-created order. */
export async function openRazorpayCheckout(
  order: RazorpayOrder,
  customer: PaymentCustomer,
): Promise<PaymentAttempt> {
  if (!RAZORPAY_KEY_ID) {
    return { status: "failed", message: "Online payment isn't configured right now." };
  }

  const Razorpay = await loadSdk();

  return new Promise<PaymentAttempt>((resolve) => {
    let settled = false;
    const settle = (result: PaymentAttempt) => {
      if (settled) return;
      settled = true;
      document.documentElement.classList.remove("razorpay-checkout-open");
      resolve(result);
    };

    const checkout = new Razorpay({
      key: RAZORPAY_KEY_ID,
      // Amount and currency come from the backend order only.
      amount: order.amount,
      currency: order.currency,
      order_id: order.id,
      name: "CommerceAI",
      description: "Order payment",
      prefill: { name: customer.name, contact: customer.phone, ...(customer.email ? { email: customer.email } : {}) },
      theme: { color: "#2f4f80" },
      modal: { ondismiss: () => settle({ status: "dismissed" }) },
      handler: (response: RazorpayResponse) =>
        settle({
          status: "success",
          handshake: {
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_signature: response.razorpay_signature,
          },
        }),
    });

    checkout.on?.("payment.failed", () =>
      settle({ status: "failed", message: "The payment was declined. Your cart is unchanged." }),
    );

    document.documentElement.classList.add("razorpay-checkout-open");
    try {
      checkout.open();
    } catch {
      settle({ status: "failed", message: "The payment window couldn't be opened. Please try again." });
    }
  });
}
