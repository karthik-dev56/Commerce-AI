import { useQuery } from "@tanstack/react-query";
import { ProductImage } from "@/components/commerce/ProductImage";
import { createFileRoute, Link } from "@tanstack/react-router";

import { OrderStatusBadge } from "@/components/commerce/OrderStatusBadge";
import { EmptyState } from "@/components/commerce/StateBlocks";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, formatPrice } from "@/lib/format";
import { ordersService } from "@/services/api/orders";

export const Route = createFileRoute("/order/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `Order ${params.id} — CommerceAI` },
      { name: "description", content: "Order details, items and delivery status." },
      { property: "og:title", content: `Order ${params.id} — CommerceAI` },
      { property: "og:description", content: "Order details, items and delivery status." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OrderDetailPage,
});

function OrderDetailPage() {
  const { id } = Route.useParams();
  const { data: order, isLoading } = useQuery({
    queryKey: ["order", id],
    queryFn: () => ordersService.get(id),
  });

  if (isLoading) {
    return (
      <div className="container-page py-10">
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container-page py-16">
        <EmptyState
          title="Order not found"
          description="This order doesn't exist or is no longer available."
          action={
            <Button asChild>
              <Link to="/orders">Back to orders</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="container-page max-w-4xl py-8 md:py-10">
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted-foreground">
        <Link to="/orders" className="hover:text-foreground">
          Orders
        </Link>
        <span className="px-2">/</span>
        <span className="text-foreground">{order.id}</span>
      </nav>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Order {order.id}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Placed on {formatDate(order.createdAt)} · Paid by {order.paymentMethod}
          </p>
        </div>
        <OrderStatusBadge status={order.status} />
      </header>

      {order.status === "payment_failed" ? (
        <div className="mt-6 rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm">
          <p className="font-medium text-destructive">Payment couldn't be completed</p>
          <p className="mt-1 text-muted-foreground">
            This order isn't confirmed yet. You can retry the payment from your cart.
          </p>
          <Button asChild size="sm" className="mt-3">
            <Link to="/cart">Return to Cart</Link>
          </Button>
        </div>
      ) : null}

      <div className="mt-8 grid gap-8 md:grid-cols-[minmax(0,1fr)_280px]">
        <div className="rounded-lg border border-border">
          <ul className="divide-y divide-border">
            {order.items.map((item) => (
              <li key={item.id} className="flex items-center gap-4 p-4">
                <ProductImage src={item.image} alt={item.title} className="h-16 w-16 rounded-md border border-border object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    {item.brand}
                  </p>
                  <Link
                    to="/product/$handle"
                    params={{ handle: item.handle }}
                    className="truncate text-sm font-medium hover:underline"
                  >
                    {item.title}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {item.variantTitle} · Qty {item.quantity}
                  </p>
                </div>
                <p className="text-sm font-semibold">
                  {formatPrice(item.unitPrice * item.quantity)}
                </p>
              </li>
            ))}
          </ul>
        </div>

        <aside className="space-y-6">
          <div className="rounded-lg border border-border p-4 text-sm">
            <p className="font-medium">Payment summary</p>
            <dl className="mt-3 space-y-2">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd>{formatPrice(order.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Shipping</dt>
                <dd>{order.shipping ? formatPrice(order.shipping) : "Free"}</dd>
              </div>
            </dl>
            <Separator className="my-3" />
            <div className="flex justify-between font-semibold">
              <span>Total</span>
              <span>{formatPrice(order.total)}</span>
            </div>
          </div>

          <div className="rounded-lg border border-border p-4 text-sm">
            <p className="font-medium">Delivery</p>
            <p className="mt-2 text-muted-foreground">
              {order.shippingAddress.name}
              <br />
              {order.shippingAddress.addressLine1}
              <br />
              {order.shippingAddress.city}, {order.shippingAddress.state}{" "}
              {order.shippingAddress.pincode}
              <br />
              {order.shippingAddress.phone}
            </p>
            <p className="mt-3 text-muted-foreground">
              Estimated delivery: {formatDate(order.estimatedDelivery)}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
