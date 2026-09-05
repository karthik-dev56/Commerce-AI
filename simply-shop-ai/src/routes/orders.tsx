import { useQuery } from "@tanstack/react-query";
import { ProductImage } from "@/components/commerce/ProductImage";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Package } from "lucide-react";

import { OrderStatusBadge } from "@/components/commerce/OrderStatusBadge";
import { EmptyState, ErrorState } from "@/components/commerce/StateBlocks";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, formatPrice } from "@/lib/format";
import { DEFAULT_PRODUCT_SEARCH } from "@/lib/product-search";
import { ordersService } from "@/services/api/orders";

export const Route = createFileRoute("/orders")({
  head: () => ({
    meta: [
      { title: "Your orders — CommerceAI" },
      { name: "description", content: "Track your CommerceAI orders and delivery status." },
      { property: "og:title", content: "Your orders — CommerceAI" },
      { property: "og:description", content: "Track your orders and delivery status." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OrdersPage,
});

function OrdersPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["orders"],
    queryFn: () => ordersService.list(),
  });

  const orders = data ?? [];

  return (
    <div className="container-page py-8 md:py-10">
      <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Your orders</h1>
      <p className="mt-1 text-sm text-muted-foreground">Track and review everything you've bought.</p>

      <div className="mt-8 space-y-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-40 w-full rounded-lg" />
          ))
        ) : isError ? (
          <ErrorState onRetry={() => void refetch()} />
        ) : orders.length === 0 ? (
          <EmptyState
            icon={<Package className="h-8 w-8" />}
            title="No orders yet"
            description="Your orders will appear here once you place one."
            action={
              <Button asChild>
                <Link to="/products" search={DEFAULT_PRODUCT_SEARCH}>
                  Start shopping
                </Link>
              </Button>
            }
          />
        ) : (
          orders.map((order) => (
            <article key={order.id} className="rounded-lg border border-border bg-card">
              <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
                <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Order</p>
                    <p className="font-medium">{order.id}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Placed on</p>
                    <p className="font-medium">{formatDate(order.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total</p>
                    <p className="font-medium">{formatPrice(order.total)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <OrderStatusBadge status={order.status} />
                  <Button asChild variant="outline" size="sm">
                    <Link to="/order/$id" params={{ id: order.id }}>
                      View details
                    </Link>
                  </Button>
                </div>
              </header>

              <ul className="divide-y divide-border">
                {order.items.map((item) => (
                  <li key={item.id} className="flex items-center gap-4 p-4">
                    <ProductImage src={item.image} alt={item.title} className="h-14 w-14 rounded-md border border-border object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{item.title}</p>
                      <p className="text-xs text-muted-foreground">Qty {item.quantity}</p>
                    </div>
                    <p className="text-sm">{formatPrice(item.unitPrice * item.quantity)}</p>
                  </li>
                ))}
              </ul>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
