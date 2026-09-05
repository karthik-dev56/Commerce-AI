import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

import { ProductGrid } from "@/components/commerce/ProductGrid";
import { SectionHeader } from "@/components/commerce/SectionHeader";
import { SmartSearchBar } from "@/components/commerce/SmartSearchBar";
import { EmptyState, ErrorState } from "@/components/commerce/StateBlocks";
import { Badge } from "@/components/ui/badge";
import { interactionsService } from "@/services/api/interactions";
import { productsService } from "@/services/api/products";

export const Route = createFileRoute("/search")({
  validateSearch: (search: Record<string, unknown>) => ({
    q: typeof search["q"] === "string" ? search["q"] : "",
  }),
  head: () => ({
    meta: [
      { title: "Search results — CommerceAI" },
      {
        name: "description",
        content:
          "Describe what you need in plain language and see matching products, filtered to your budget and requirements.",
      },
      { property: "og:title", content: "Search results — CommerceAI" },
      {
        property: "og:description",
        content: "Describe what you need and see the products that match.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  const { q } = Route.useSearch();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["smart-search", q],
    queryFn: () => productsService.smartSearch(q),
    enabled: q.trim().length > 0,
  });

  useEffect(() => {
    const trimmed = q.trim();
    if (!trimmed) return;
    void interactionsService.record({
      eventType: "SEARCH",
      context: { query: trimmed, searchType: "natural-language" },
    });
  }, [q]);

  return (
    <div className="container-page py-8 md:py-10">
      <div className="max-w-2xl">
        <SmartSearchBar defaultValue={q} size="lg" showSuggestions={!q} />
      </div>

      {q ? (
        <div className="mt-8">
          <h1 className="text-xl font-semibold tracking-tight md:text-2xl">Results for: {q}</h1>
          {data?.summary ? (
            <p className="mt-1 text-sm text-muted-foreground">{data.summary}</p>
          ) : null}

          {data && data.appliedFilters.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {data.appliedFilters.map((filter) => (
                <Badge key={`${filter.label}-${filter.value}`} variant="secondary">
                  {filter.label}: {filter.value}
                </Badge>
              ))}
            </div>
          ) : null}

          <div className="mt-6">
            {isError ? (
              <ErrorState onRetry={() => void refetch()} />
            ) : !isLoading && (data?.products.length ?? 0) === 0 ? (
              <EmptyState
                title="No matching products"
                description="Try describing what you need differently, or adjust the budget."
              />
            ) : (
              <ProductGrid products={data?.products ?? []} isLoading={isLoading} skeletonCount={8} />
            )}
          </div>

          {data && data.related.length > 0 ? (
            <section className="mt-14">
              <SectionHeader title="You may also like" />
              <ProductGrid products={data.related} compact />
            </section>
          ) : null}
        </div>
      ) : (
        <div className="mt-10">
          <EmptyState
            title="Tell us what you need"
            description="Try something like “Gaming laptop under ₹80,000” or “Headphones for office calls”."
          />
        </div>
      )}
    </div>
  );
}
