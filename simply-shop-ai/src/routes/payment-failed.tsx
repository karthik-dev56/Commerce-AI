import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/payment-failed")({
  validateSearch: (search: Record<string, unknown>) => ({
    order: typeof search["order"] === "string" ? search["order"] : "",
  }),
  head: () => ({
    meta: [
      { title: "Payment not completed — CommerceAI" },
      { name: "description", content: "Your payment could not be completed." },
      { property: "og:title", content: "Payment not completed — CommerceAI" },
      { property: "og:description", content: "Your payment could not be completed." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PaymentFailedPage,
});

function PaymentFailedPage() {
  const { order } = Route.useSearch();

  return (
    <div className="container-page max-w-xl py-16">
      <div className="flex flex-col items-center text-center">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">
          Payment couldn't be completed
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your order has not been confirmed. No amount has been charged.
        </p>
        {order ? (
          <p className="mt-1 text-sm text-muted-foreground">
            Reference: <span className="font-medium text-foreground">{order}</span>
          </p>
        ) : null}

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild>
            <Link to="/checkout">Try Payment Again</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/cart">Return to Cart</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
