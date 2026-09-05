import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { ErrorState } from "@/components/commerce/StateBlocks";
import { Skeleton } from "@/components/ui/skeleton";
import { DEFAULT_PRODUCT_SEARCH } from "@/lib/product-search";
import { productsService } from "@/services/api/products";

export const Route = createFileRoute("/categories")({
  head: () => ({
    meta: [
      { title: "Shop by category — CommerceAI" },
      {
        name: "description",
        content:
          "Browse electronics, accessories, home appliances, furniture and fashion on CommerceAI.",
      },
      { property: "og:title", content: "Shop by category — CommerceAI" },
      {
        property: "og:description",
        content: "Electronics, accessories, home appliances, furniture and fashion.",
      },
    ],
  }),
  component: CategoriesPage,
});

function CategoriesPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["categories"],
    queryFn: () => productsService.categories(),
    staleTime: 300_000,
  });

  return (
    <div className="container-page py-8 md:py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Categories</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Browse the catalogue by what you're shopping for.
        </p>
      </header>

      {isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {isLoading
            ? Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-36 w-full rounded-lg" />
              ))
            : (data ?? []).map((category) => (
                <Link
                  key={category.id}
                  to="/products"
                  search={{ ...DEFAULT_PRODUCT_SEARCH, category: category.slug }}
                  className="flex h-36 flex-col justify-between rounded-lg border border-border bg-card p-5 transition-shadow hover:shadow-card-hover"
                >
                  <div>
                    <h2 className="text-base font-semibold">{category.name}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{category.description}</p>
                  </div>
                  <span className="flex items-center justify-between text-sm text-muted-foreground">
                    {category.productCount ?? 0} {category.productCount === 1 ? "product" : "products"}
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </Link>
              ))}
        </div>
      )}
    </div>
  );
}
