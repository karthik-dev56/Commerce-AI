import { Star } from "lucide-react";

import { cn } from "@/lib/utils";

interface RatingStarsProps {
  rating: number;
  reviewCount?: number | undefined;
  size?: "sm" | "md";
  className?: string;
}

export function RatingStars({ rating, reviewCount, size = "sm", className }: RatingStarsProps) {
  const iconSize = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <span
        className="flex items-center gap-0.5"
        aria-label={`Rated ${rating.toFixed(1)} out of 5`}
      >
        {[0, 1, 2, 3, 4].map((index) => (
          <Star
            key={index}
            aria-hidden="true"
            className={cn(
              iconSize,
              index < Math.round(rating)
                ? "fill-warning text-warning"
                : "fill-muted text-border-strong",
            )}
          />
        ))}
      </span>
      <span className={cn("text-muted-foreground", size === "sm" ? "text-xs" : "text-sm")}>
        {rating.toFixed(1)}
        {reviewCount !== undefined ? ` (${reviewCount.toLocaleString("en-IN")})` : ""}
      </span>
    </div>
  );
}
