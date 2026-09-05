import crypto from "node:crypto";

export type PaymentWorkflowStatus =
  | "STARTED"
  | "PAYMENT_VERIFIED"
  | "ORDER_COMPLETED"
  | "FAILED";

export interface PaymentWorkflowInput {
  cartId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
}

export interface PaymentWorkflowResult {
  workflowId: string;
  status: PaymentWorkflowStatus;
  cartId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  attempts: number;
  error?: string;
}

export async function executePaymentWorkflow(
  input: PaymentWorkflowInput
): Promise<PaymentWorkflowResult> {
  const workflowId = crypto.randomUUID();

  let attempts = 0;

  try {
    attempts++;

    return {
      workflowId,
      status: "ORDER_COMPLETED",
      cartId: input.cartId,
      razorpayOrderId: input.razorpayOrderId,
      razorpayPaymentId: input.razorpayPaymentId,
      attempts,
    };
  } catch (error) {
    return {
      workflowId,
      status: "FAILED",
      cartId: input.cartId,
      razorpayOrderId: input.razorpayOrderId,
      razorpayPaymentId: input.razorpayPaymentId,
      attempts,
      error:
        error instanceof Error
          ? error.message
          : "Workflow execution failed",
    };
  }
}