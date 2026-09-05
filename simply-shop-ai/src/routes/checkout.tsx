import { ProductImage } from "@/components/commerce/ProductImage";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Check, Lock } from "lucide-react";
import { useState } from "react";
import { z } from "zod";

import { EmptyState } from "@/components/commerce/StateBlocks";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useCart } from "@/hooks/useCart";
import { formatPrice } from "@/lib/format";
import { DEFAULT_PRODUCT_SEARCH } from "@/lib/product-search";
import { cn } from "@/lib/utils";
import { checkoutService } from "@/services/api/checkout";
import { getSessionId } from "@/services/api/interactions";
import { openRazorpayCheckout } from "@/services/payments/razorpay";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout — CommerceAI" },
      {
        name: "description",
        content: "Enter delivery details, review your order and pay securely.",
      },
      { property: "og:title", content: "Checkout — CommerceAI" },
      { property: "og:description", content: "Delivery, order review and secure payment." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CheckoutPage,
});

const addressSchema = z.object({
  name: z.string().trim().min(2, "Enter the full name"),
  phone: z
    .string()
    .trim()
    .regex(/^(\+91[\s-]?)?[6-9]\d{9}$/, "Enter a valid 10-digit mobile number"),
  addressLine1: z.string().trim().min(6, "Enter the full address"),
  addressLine2: z.string().trim().optional(),
  city: z.string().trim().min(2, "Enter the city"),
  state: z.string().trim().min(2, "Enter the state"),
  pincode: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter a valid 6-digit pincode"),
});

type AddressForm = z.infer<typeof addressSchema>;
type FieldErrors = Partial<Record<keyof AddressForm, string>>;

const STEPS = ["Delivery", "Order Review", "Payment"] as const;

function StepIndicator({ current }: { current: number }) {
  return (
    <ol className="mb-8 flex items-center gap-2 text-sm">
      {STEPS.map((step, index) => {
        const state = index < current ? "done" : index === current ? "active" : "todo";
        return (
          <li key={step} className="flex flex-1 items-center gap-2">
            <span
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                state === "done" && "border-primary bg-primary text-primary-foreground",
                state === "active" && "border-primary text-primary",
                state === "todo" && "border-border text-muted-foreground",
              )}
            >
              {state === "done" ? <Check className="h-3.5 w-3.5" /> : index + 1}
            </span>
            <span
              className={cn(
                "truncate",
                state === "todo" ? "text-muted-foreground" : "font-medium text-foreground",
              )}
            >
              {step}
            </span>
            {index < STEPS.length - 1 ? (
              <span aria-hidden="true" className="hidden h-px flex-1 bg-border sm:block" />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

function CheckoutPage() {
  const navigate = useNavigate();
  const { cart, isLoading, clear } = useCart();

  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [form, setForm] = useState<AddressForm>({
    name: "",
    phone: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    pincode: "",
  });
  const [consentOpen, setConsentOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [paymentNotice, setPaymentNotice] = useState<string | null>(null);
  const [confirmedOrderId, setConfirmedOrderId] = useState<string | null>(null);

  const items = cart?.items ?? [];

  if (confirmedOrderId) {
    return (
      <div className="container-page max-w-xl py-16">
        <div className="flex flex-col items-center text-center">
          <Check className="h-10 w-10 text-success" />
          <h1 className="mt-4 text-2xl font-semibold tracking-tight">Payment successful</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your order is confirmed. Payment reference:{" "}
            <span className="font-medium text-foreground">{confirmedOrderId}</span>
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild>
              <Link to="/orders">View Orders</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/products" search={DEFAULT_PRODUCT_SEARCH}>
                Continue Shopping
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!isLoading && items.length === 0) {
    return (
      <div className="container-page py-16">
        <EmptyState
          title="Your cart is empty"
          description="Add something to your cart before checking out."
          action={
            <Button asChild>
              <Link to="/products" search={DEFAULT_PRODUCT_SEARCH}>
                Shop products
              </Link>
            </Button>
          }
        />
      </div>
    );
  }

  function submitDelivery(event: React.FormEvent) {
    event.preventDefault();
    const result = addressSchema.safeParse(form);
    if (!result.success) {
      const next: FieldErrors = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof AddressForm;
        if (!next[key]) next[key] = issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    setStep(1);
  }

  /** Runs only after the shopper explicitly confirms in the consent dialog. */
  async function confirmAndPay() {
    if (!cart?.id) {
      setPaymentNotice("Your cart isn't ready yet. Please reload and try again.");
      return;
    }

    // Radix Dialog traps focus and disables pointer interaction outside itself.
    // Unmount it before Razorpay injects its own modal so the payment iframe can
    // receive mouse, touch and keyboard input without competing modal layers.
    setConsentOpen(false);
    setProcessing(true);
    setPaymentNotice(null);

    await new Promise<void>((resolve) => {
      window.requestAnimationFrame(() => window.requestAnimationFrame(() => resolve()));
    });

    const sessionId = getSessionId();

    // The authorization mandate records the shopper's consent. Without it the
    // backend refuses to create a payment order, so no order can be started
    // by skipping this dialog.
    let mandateId: string;
    try {
      const mandate = await checkoutService.createMandate({
        sessionId,
        cartId: cart.id,
        maxAmount: cart.total,
        currency: cart.currency,
      });
      mandateId = mandate.mandateId;
    } catch {
      setPaymentNotice(
        "We couldn't confirm your authorization for this purchase. No payment was started.",
      );
      setProcessing(false);
      return;
    }

    try {
      // No amount is sent — the backend owns the payable total.
      const order = await checkoutService.createOrder(cart.id, mandateId, sessionId);

      const attempt = await openRazorpayCheckout(order, {
        name: form.name,
        phone: form.phone,
      });

      if (attempt.status === "dismissed") {
        setPaymentNotice("Payment was not completed. Your cart is unchanged.");
        return;
      }
      if (attempt.status === "failed") {
        setPaymentNotice(attempt.message);
        return;
      }

      // Never treat the provider callback alone as proof of payment.
      const verification = await checkoutService.verifyPayment(cart.id, attempt.handshake);
      const orderCompleted =
        verification.verified && verification.workflow?.status === "ORDER_COMPLETED";

      if (!orderCompleted) {
        void navigate({
          to: "/payment-failed",
          search: { order: attempt.handshake.razorpay_order_id },
        });
        return;
      }

      setConfirmedOrderId(verification.orderId ?? attempt.handshake.razorpay_order_id);
      await clear();
    } catch {
      setPaymentNotice("We couldn't start this payment right now. Please try again.");
    } finally {
      setProcessing(false);
      setConsentOpen(false);
    }
  }

  const field = (key: keyof AddressForm, label: string, props: Record<string, unknown> = {}) => (
    <div className="space-y-1.5">
      <Label htmlFor={key}>{label}</Label>
      <Input
        id={key}
        value={form[key] ?? ""}
        onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}
        aria-invalid={Boolean(errors[key])}
        aria-describedby={errors[key] ? `${key}-error` : undefined}
        {...props}
      />
      {errors[key] ? (
        <p id={`${key}-error`} className="text-xs text-destructive">
          {errors[key]}
        </p>
      ) : null}
    </div>
  );

  return (
    <div className="container-page py-8 md:py-10">
      <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Checkout</h1>

      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div>
          <StepIndicator current={step} />

          {step === 0 ? (
            <form onSubmit={submitDelivery} className="space-y-5" noValidate>
              <h2 className="text-lg font-semibold">Delivery details</h2>
              <div className="grid gap-5 sm:grid-cols-2">
                {field("name", "Full name", { autoComplete: "name" })}
                {field("phone", "Phone number", { autoComplete: "tel", inputMode: "tel" })}
              </div>
              {field("addressLine1", "Address", { autoComplete: "address-line1" })}
              {field("addressLine2", "Apartment, landmark (optional)", {
                autoComplete: "address-line2",
              })}
              <div className="grid gap-5 sm:grid-cols-3">
                {field("city", "City", { autoComplete: "address-level2" })}
                {field("state", "State", { autoComplete: "address-level1" })}
                {field("pincode", "Pincode", { inputMode: "numeric", autoComplete: "postal-code" })}
              </div>
              <Button type="submit" size="lg">
                Continue to review
              </Button>
            </form>
          ) : null}

          {step === 1 ? (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold">Order review</h2>

              <div className="rounded-lg border border-border p-4 text-sm">
                <p className="font-medium">Delivering to {form.name}</p>
                <p className="mt-1 text-muted-foreground">
                  {form.addressLine1}
                  {form.addressLine2 ? `, ${form.addressLine2}` : ""}, {form.city}, {form.state}{" "}
                  {form.pincode}
                </p>
                <p className="mt-1 text-muted-foreground">{form.phone}</p>
                <Button variant="link" className="mt-1 h-auto p-0" onClick={() => setStep(0)}>
                  Edit delivery details
                </Button>
              </div>

              <ul className="divide-y divide-border rounded-lg border border-border">
                {items.map((item) => (
                  <li key={item.id} className="flex items-center gap-4 p-4">
                    <ProductImage
                      src={item.image}
                      alt={item.title}
                      className="h-16 w-16 rounded-md border border-border object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{item.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.variantTitle} · Qty {item.quantity}
                      </p>
                    </div>
                    <p className="text-sm font-semibold">
                      {item.lineTotal !== undefined ? formatPrice(item.lineTotal) : "—"}
                    </p>
                  </li>
                ))}
              </ul>

              <div className="flex gap-3">
                <Button size="lg" onClick={() => setStep(2)}>
                  Continue to payment
                </Button>
                <Button size="lg" variant="outline" onClick={() => setStep(0)}>
                  Back
                </Button>
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold">Payment</h2>

              <div className="rounded-lg border border-border p-5">
                <div className="flex items-start gap-3">
                  <Lock className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <div className="text-sm">
                    <p className="font-medium">Secure online payment</p>
                    <p className="mt-1 text-muted-foreground">
                      You'll pay with UPI, card, net banking or a wallet in the secure payment
                      window. Your payment details are never stored by this store.
                    </p>
                  </div>
                </div>
              </div>

              {paymentNotice ? (
                <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                  {paymentNotice}
                </p>
              ) : null}

              <div className="flex gap-3">
                <Button size="lg" onClick={() => setConsentOpen(true)} disabled={processing}>
                  Review and pay {formatPrice(cart?.total ?? 0)}
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => setStep(1)}
                  disabled={processing}
                >
                  Back
                </Button>
              </div>
            </div>
          ) : null}
        </div>

        <aside className="h-fit rounded-lg border border-border bg-card p-5 lg:sticky lg:top-24">
          <h2 className="text-base font-semibold">Summary</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Items</dt>
              <dd>{items.reduce((sum, item) => sum + item.quantity, 0)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd>{formatPrice(cart?.subtotal ?? 0)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Shipping</dt>
              <dd>{cart?.shipping ? formatPrice(cart.shipping) : "Free"}</dd>
            </div>
          </dl>
          <Separator className="my-4" />
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-medium">Total</span>
            <span className="text-xl font-semibold">{formatPrice(cart?.total ?? 0)}</span>
          </div>
        </aside>
      </div>

      {consentOpen ? (
        <Dialog open onOpenChange={(open) => !processing && setConsentOpen(open)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Allow AI to complete this purchase?</DialogTitle>
              <DialogDescription>
                Nothing is charged until you allow this and complete payment.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 text-sm">
              <ul className="space-y-2">
                {items.map((item) => (
                  <li key={item.id} className="flex justify-between gap-4">
                    <span className="truncate text-muted-foreground">
                      {item.title} × {item.quantity}
                    </span>
                    <span className="shrink-0 font-medium">
                      {item.lineTotal !== undefined ? formatPrice(item.lineTotal) : "—"}
                    </span>
                  </li>
                ))}
              </ul>
              <Separator />
              <div className="flex justify-between text-base font-semibold">
                <span>Cart total</span>
                <span>{formatPrice(cart?.total ?? 0)}</span>
              </div>
              <dl className="space-y-2">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Currency</dt>
                  <dd>{cart?.currency ?? ""}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Maximum authorized spend</dt>
                  <dd className="font-medium">{formatPrice(cart?.total ?? 0)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Authorization expires</dt>
                  <dd>In 15 minutes</dd>
                </div>
              </dl>
              <p className="text-muted-foreground">
                This authorization applies only to the items in this cart and cannot be reused for
                any other purchase.
              </p>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setConsentOpen(false)} disabled={processing}>
                Cancel
              </Button>
              <Button onClick={() => void confirmAndPay()} disabled={processing}>
                {processing ? "Placing order…" : "Allow & Continue"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}
