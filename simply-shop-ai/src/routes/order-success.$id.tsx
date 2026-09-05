import { useQuery } from "@tanstack/react-query";
import { ProductImage } from "@/components/commerce/ProductImage";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";

import { EmptyState } from "@/components/commerce/StateBlocks";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, formatPrice } from "@/lib/format";
import { DEFAULT_PRODUCT_SEARCH } from "@/lib/product-search";
import { ordersService } from "@/services/api/orders";

export const Route = createFileRoute("/order-success/$id")({
  head: () => ({
    meta: [
      { title: "Order confirmed — CommerceAI" },
      { name: "description", content: "Your order has been placed successfully." },
      { property: "og:title", content: "Order confirmed — CommerceAI" },
      { property: "og:description", content: "Your order has been placed successfully." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OrderSuccessPage,
});

function OrderSuccessPage() {
  const { id } = Route.useParams();
  const { data: order, isLoading } = useQuery({
    queryKey: ["order", id],
    queryFn: () => ordersService.get(id),
  });

  if (isLoading) {
    return (
      <div className="container-page py-12">
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container-page py-16">
        <EmptyState title="Order not found" description="We couldn't find this order." />
      </div>
    );
  }

  const awaitingPayment = order.paymentMethod === "Pending";

  return (
    <div className="container-page max-w-3xl py-12">
      <div className="flex flex-col items-center text-center">
        <CheckCircle2 className="h-10 w-10 text-success" />
        <h1 className="mt-4 text-2xl font-semibold tracking-tight md:text-3xl">Order confirmed</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Order <span className="font-medium text-foreground">{order.id}</span> placed on{" "}
          {formatDate(order.createdAt)}.
          {awaitingPayment ? " Payment confirmation is pending." : ""}
        </p>
      </div>

      <div className="mt-8 rounded-lg border border-border">
        <ul className="divide-y divide-border">
          {order.items.map((item) => (
            <li key={item.id} className="flex items-center gap-4 p-4">
              <ProductImage src={item.image} alt={item.title} className="h-16 w-16 rounded-md border border-border object-cover" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{item.title}</p>
                <p className="text-xs text-muted-foreground">
                  {item.variantTitle} · Qty {item.quantity}
                </p>
              </div>
              <p className="text-sm font-semibold">{formatPrice(item.unitPrice * item.quantity)}</p>
            </li>
          ))}
        </ul>
        <Separator />
        <div className="space-y-2 p-4 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total paid</span>
            <span className="font-semibold">{formatPrice(order.total)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Estimated delivery</span>
            <span>{formatDate(order.estimatedDelivery)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Delivering to</span>
            <span className="text-right">
              {order.shippingAddress.name}, {order.shippingAddress.city}{" "}
              {order.shippingAddress.pincode}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button asChild>
          <Link to="/order/$id" params={{ id: order.id }}>
            View Order
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/products" search={DEFAULT_PRODUCT_SEARCH}>
            Continue Shopping
          </Link>
        </Button>
      </div>
    </div>
  );
}
