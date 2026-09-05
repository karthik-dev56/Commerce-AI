import { ProductCard } from "./ProductCard";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { Product } from "@/types/commerce";

interface ProductGridProps {
  products: Product[];
  isLoading?: boolean;
  skeletonCount?: number;
  columnsClassName?: string;
  compact?: boolean;
  onProductSelect?: (product: Product) => void;
}

export function ProductCardSkeleton() {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card">
      <Skeleton className="aspect-square w-full rounded-none" />
      <div className="space-y-2 p-4">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-8 w-full" />
      </div>
    </div>
  );
}

export function ProductGrid({
  products,
  isLoading = false,
  skeletonCount = 8,
  columnsClassName = "grid-cols-2 md:grid-cols-3 xl:grid-cols-4",
  compact = false,
  onProductSelect,
}: ProductGridProps) {
  return (
    <div className={cn("grid gap-4 md:gap-5", columnsClassName)}>
      {isLoading
        ? Array.from({ length: skeletonCount }).map((_, index) => (
            <ProductCardSkeleton key={index} />
          ))
        : products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              compact={compact}
              {...(onProductSelect ? { onSelect: onProductSelect } : {})}
            />
          ))}
    </div>
  );
}
