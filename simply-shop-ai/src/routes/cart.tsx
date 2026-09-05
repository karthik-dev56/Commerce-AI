import { ProductImage } from "@/components/commerce/ProductImage";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";

import { RecommendationSection } from "@/components/commerce/RecommendationSection";
import { EmptyState } from "@/components/commerce/StateBlocks";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useCart } from "@/hooks/useCart";
import { formatPrice } from "@/lib/format";
import { DEFAULT_PRODUCT_SEARCH } from "@/lib/product-search";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Your cart — CommerceAI" },
      { name: "description", content: "Review the items in your cart before checking out." },
      { property: "og:title", content: "Your cart — CommerceAI" },
      { property: "og:description", content: "Review your items, delivery estimate and total." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const { cart, isLoading, pendingLineId, updateQuantity, removeItem } = useCart();
  const items = cart?.items ?? [];

  if (isLoading) {
    return (
      <div className="container-page py-10">
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="container-page py-16">
        <EmptyState
          icon={<ShoppingCart className="h-8 w-8" />}
          title="Your cart is empty"
          description="Browse the catalogue and add something you need."
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

  return (
    <div className="container-page py-8 md:py-10">
      <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Shopping cart</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {items.length} {items.length === 1 ? "item" : "items"} in your cart
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <ul className="divide-y divide-border rounded-lg border border-border">
          {items.map((item) => (
            <li key={item.id} className="flex gap-4 p-4">
              <Link
                to="/product/$handle"
                params={{ handle: item.handle }}
                className="h-24 w-24 shrink-0 overflow-hidden rounded-md border border-border bg-muted"
              >
                <ProductImage
                  src={item.image}
                  alt={item.title}
                  className="h-full w-full object-cover"
                />
              </Link>

              <div className="flex min-w-0 flex-1 flex-col gap-1">
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
                <p className="text-xs text-muted-foreground">Variant: {item.variantTitle}</p>

                <div className="mt-auto flex flex-wrap items-center gap-3 pt-2">
                  <div className="inline-flex items-center rounded-md border border-input">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-r-none"
                      aria-label={`Decrease quantity of ${item.title}`}
                      disabled={pendingLineId !== null || item.quantity <= 1}
                      onClick={() => void updateQuantity(item.id, item.quantity - 1)}
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </Button>
                    <span className="w-9 text-center text-sm font-medium">{item.quantity}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-l-none"
                      aria-label={`Increase quantity of ${item.title}`}
                      disabled={pendingLineId !== null}
                      onClick={() => void updateQuantity(item.id, item.quantity + 1)}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 text-muted-foreground"
                    disabled={pendingLineId !== null}
                    onClick={() => void removeItem(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                    Remove
                  </Button>
                </div>
              </div>

              <div className="text-right">
                {item.lineTotal !== undefined ? (
                  <div className="text-sm font-semibold">{formatPrice(item.lineTotal)}</div>
                ) : null}
                {item.unitPrice !== undefined ? (
                  <div className="text-xs text-muted-foreground">
                    {formatPrice(item.unitPrice)} × {item.quantity}
                  </div>
                ) : null}
              </div>
            </li>
          ))}
        </ul>

        <aside className="h-fit rounded-lg border border-border bg-card p-5 lg:sticky lg:top-24">
          <h2 className="text-base font-semibold">Order summary</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd>{formatPrice(cart?.subtotal ?? 0)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Delivery</dt>
              <dd>{cart?.shipping ? formatPrice(cart.shipping) : "Free"}</dd>
            </div>
            {cart?.deliveryEstimate ? (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Delivery estimate</dt>
                <dd>{cart.deliveryEstimate}</dd>
              </div>
            ) : null}
          </dl>
          <Separator className="my-4" />
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-medium">Total</span>
            <span className="text-xl font-semibold">{formatPrice(cart?.total ?? 0)}</span>
          </div>
          <Button asChild size="lg" className="mt-5 w-full">
            <Link to="/checkout">Proceed to Checkout</Link>
          </Button>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            You'll confirm the order before any payment is taken.
          </p>
        </aside>
      </div>

      <div className="mt-16">
        <RecommendationSection
          slot="cart_addons"
          contextProductIds={items.map((item) => item.productId)}
          compact
        />
      </div>
    </div>
  );
}
