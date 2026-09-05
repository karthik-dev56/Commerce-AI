import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

import { ProductGrid } from "./ProductGrid";
import { SectionHeader } from "./SectionHeader";
import { trackRecommendationClicked, trackRecommendationsViewed } from "@/lib/algoliaInsights";
import {
  getValidatedRecommendations,
  type RecommendationConstraints,
} from "@/services/api/recommendations";
import type { Product } from "@/types/commerce";

interface ValidatedRecommendationsProps {
  productId: string;
  title?: string;
  constraints?: RecommendationConstraints;
}

/**
 * Renders the backend's validated recommendations
 * (Medusa → Algolia Related Products → backend validation).
 * No ranking, scoring or filtering happens here.
 */
export function ValidatedRecommendations({
  productId,
  title = "You may also like",
  constraints = { inStockOnly: true },
}: ValidatedRecommendationsProps) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["validated-recommendations", productId, constraints],
    queryFn: () => getValidatedRecommendations(productId, constraints),
    enabled: Boolean(productId),
    staleTime: 60_000,
    retry: false,
  });

  const impressionKey = useRef<string | null>(null);
  const products: Product[] = data ?? [];

  useEffect(() => {
    if (products.length === 0) return;
    const key = `${productId}:${products.map((p) => p.id).join(",")}`;
    if (impressionKey.current === key) return;
    impressionKey.current = key;
    trackRecommendationsViewed(products.map((p) => p.id));
  }, [productId, products]);

  if (isError) return null;
  if (!isLoading && products.length === 0) return null;

  return (
    <section>
      <SectionHeader title={title} />
      <ProductGrid
        products={products}
        isLoading={isLoading}
        skeletonCount={4}
        onProductSelect={(product) => {
          const position = products.findIndex((p) => p.id === product.id);
          trackRecommendationClicked(product.id, position >= 0 ? position + 1 : undefined);
        }}
      />
    </section>
  );
}
