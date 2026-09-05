import crypto from "node:crypto";

const keySecret = process.env.RAZORPAY_KEY_SECRET;

if (!keySecret) {
  throw new Error("Razorpay key secret is not configured");
}

const secret: string = keySecret;

export function verifyRazorpaySignature(input: {
  orderId: string;
  paymentId: string;
  signature: string;
}) {
  const payload = `${input.orderId}|${input.paymentId}`;

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  if (expectedSignature.length !== input.signature.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature),
    Buffer.from(input.signature)
  );
}