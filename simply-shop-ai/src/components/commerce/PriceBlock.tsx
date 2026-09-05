import { cn } from "@/lib/utils";
import { discountPercent, formatPrice } from "@/lib/format";

interface PriceBlockProps {
  price: number;
  compareAtPrice?: number | undefined;
  size?: "sm" | "lg";
  className?: string;
}

export function PriceBlock({ price, compareAtPrice, size = "sm", className }: PriceBlockProps) {
  const off = discountPercent(price, compareAtPrice);

  return (
    <div className={cn("flex flex-wrap items-baseline gap-2", className)}>
      <span
        className={cn(
          "font-semibold tracking-tight text-foreground",
          size === "lg" ? "text-3xl" : "text-base",
        )}
      >
        {formatPrice(price)}
      </span>
      {compareAtPrice ? (
        <span
          className={cn("text-muted-foreground line-through", size === "lg" ? "text-base" : "text-xs")}
        >
          {formatPrice(compareAtPrice)}
        </span>
      ) : null}
      {off ? (
        <span
          className={cn(
            "font-medium text-success",
            size === "lg" ? "text-sm" : "text-xs",
          )}
        >
          {off}% off
        </span>
      ) : null}
    </div>
  );
}
