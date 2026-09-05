import { useQuery } from "@tanstack/react-query";

import { ProductGrid } from "./ProductGrid";
import { SectionHeader } from "./SectionHeader";
import { recommendationsService } from "@/services/api/recommendations";
import type { RecommendationSlot } from "@/types/commerce";

interface RecommendationSectionProps {
  slot: RecommendationSlot;
  contextProductIds?: string[];
  titleOverride?: string;
  columnsClassName?: string;
  skeletonCount?: number;
  compact?: boolean;
}

export function RecommendationSection({
  slot,
  contextProductIds = [],
  titleOverride,
  columnsClassName,
  skeletonCount = 4,
  compact = false,
}: RecommendationSectionProps) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["recommendations", slot, contextProductIds],
    queryFn: () => recommendationsService.get(slot, contextProductIds),
    staleTime: 60_000,
  });

  if (isError) return null;
  if (!isLoading && (!data || data.products.length === 0)) return null;

  return (
    <section>
      <SectionHeader title={titleOverride ?? data?.title ?? ""} note={data?.note} />
      <ProductGrid
        products={data?.products ?? []}
        isLoading={isLoading}
        skeletonCount={skeletonCount}
        compact={compact}
        {...(columnsClassName ? { columnsClassName } : {})}
      />
    </section>
  );
}
