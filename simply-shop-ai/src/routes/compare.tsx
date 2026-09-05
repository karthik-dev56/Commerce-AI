import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { X } from "lucide-react";

import { RatingStars } from "@/components/commerce/RatingStars";
import { StockBadge } from "@/components/commerce/StockBadge";
import { EmptyState } from "@/components/commerce/StateBlocks";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCart } from "@/hooks/useCart";
import { useProductSelections } from "@/hooks/useProductSelections";
import { formatPrice } from "@/lib/format";
import { DEFAULT_PRODUCT_SEARCH } from "@/lib/product-search";
import { cn } from "@/lib/utils";
import { productsService } from "@/services/api/products";
import type { Product } from "@/types/commerce";

export const Route = createFileRoute("/compare")({
  head: () => ({
    meta: [
      { title: "Compare products — CommerceAI" },
      {
        name: "description",
        content: "Compare price, display, processor, graphics, memory, storage and availability side by side.",
      },
      { property: "og:title", content: "Compare products — CommerceAI" },
      { property: "og:description", content: "Compare specifications side by side before you buy." },
    ],
  }),
  component: ComparePage,
});

const SPEC_ROWS = ["Display", "Processor", "Graphics", "Memory", "Storage"] as const;

function specValue(product: Product, label: string): string {
  return product.specifications.find((spec) => spec.label === label)?.value ?? "—";
}

/** A row is highlighted when the products differ on it. */
function rowDiffers(products: Product[], label: string): boolean {
  const values = products.map((product) => specValue(product, label));
  return new Set(values).size > 1;
}

function ComparePage() {
  const { compare, toggleCompare, clearCompare } = useProductSelections();
  const { addItem, isMutating } = useCart();

  const { data, isLoading } = useQuery({
    queryKey: ["compare", compare],
    queryFn: () => productsService.getManyByIds(compare),
    enabled: compare.length > 0,
  });

  const products = data ?? [];

  if (compare.length === 0) {
    return (
      <div className="container-page py-16">
        <EmptyState
          title="Nothing to compare yet"
          description="Add products to comparison from any product card or product page."
          action={
            <Button asChild>
              <Link to="/products" search={DEFAULT_PRODUCT_SEARCH}>
                Browse products
              </Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="container-page py-8 md:py-10">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Compare products</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Differences between the selected products are highlighted.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={clearCompare}>
          Clear all
        </Button>
      </header>

      {isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-surface">
                <th scope="col" className="w-40 p-4 text-left font-medium text-muted-foreground">
                  Product
                </th>
                {products.map((product) => (
                  <th key={product.id} scope="col" className="p-4 text-left align-top">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <img
                          src={product.images[0]}
                          alt={product.title}
                          loading="lazy"
                          className="mb-3 h-24 w-24 rounded-md border border-border object-cover"
                        />
                        <p className="text-xs text-muted-foreground">{product.brand}</p>
                        <Link
                          to="/product/$handle"
                          params={{ handle: product.handle }}
                          className="block max-w-44 font-medium hover:underline"
                        >
                          {product.title}
                        </Link>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleCompare(product.id)}
                        aria-label={`Remove ${product.title} from comparison`}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border">
                <th scope="row" className="p-4 text-left font-medium text-muted-foreground">
                  Price
                </th>
                {products.map((product) => (
                  <td key={product.id} className="p-4 font-semibold">
                    {formatPrice(product.price)}
                  </td>
                ))}
              </tr>

              {SPEC_ROWS.map((label) => {
                const differs = rowDiffers(products, label);
                return (
                  <tr key={label} className={cn("border-b border-border", differs && "bg-accent/40")}>
                    <th scope="row" className="p-4 text-left font-medium text-muted-foreground">
                      {label}
                    </th>
                    {products.map((product) => (
                      <td key={product.id} className={cn("p-4", differs && "font-medium")}>
                        {specValue(product, label)}
                      </td>
                    ))}
                  </tr>
                );
              })}

              <tr className="border-b border-border">
                <th scope="row" className="p-4 text-left font-medium text-muted-foreground">
                  Rating
                </th>
                {products.map((product) => (
                  <td key={product.id} className="p-4">
                    {product.rating !== undefined ? (
                      <RatingStars rating={product.rating} reviewCount={product.reviewCount} />
                    ) : (
                      <span className="text-xs text-muted-foreground">Not rated</span>
                    )}
                  </td>
                ))}
              </tr>

              <tr className="border-b border-border">
                <th scope="row" className="p-4 text-left font-medium text-muted-foreground">
                  Availability
                </th>
                {products.map((product) => (
                  <td key={product.id} className="p-4">
                    <StockBadge inventory={product.inventory} />
                  </td>
                ))}
              </tr>

              <tr>
                <th scope="row" className="p-4 text-left font-medium text-muted-foreground">
                  Buy
                </th>
                {products.map((product) => {
                  const variant = product.variants[0];
                  return (
                    <td key={product.id} className="p-4">
                      <Button
                        size="sm"
                        disabled={product.inventory.status === "out_of_stock" || isMutating || !variant}
                        onClick={() => {
                          if (!variant) return;
                          void addItem(
                            { productId: product.id, variantId: variant.id, quantity: 1 },
                            product.title,
                          );
                        }}
                      >
                        Add to Cart
                      </Button>
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
