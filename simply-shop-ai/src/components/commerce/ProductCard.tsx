import { Link } from "@tanstack/react-router";
import { Heart, Scale } from "lucide-react";

import { PriceBlock } from "./PriceBlock";
import { ProductImage } from "./ProductImage";
import { RatingStars } from "./RatingStars";
import { StockBadge } from "./StockBadge";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/useCart";
import { useProductSelections } from "@/hooks/useProductSelections";
import { cn } from "@/lib/utils";
import type { Product } from "@/types/commerce";

interface ProductCardProps {
  product: Product;
  className?: string;
  compact?: boolean;
  /** Fired when the shopper opens this product from the card. */
  onSelect?: (product: Product) => void;
}

export function ProductCard({ product, className, compact = false, onSelect }: ProductCardProps) {
  const { addItem, isMutating } = useCart();
  const { isWishlisted, toggleWishlist, isComparing, toggleCompare } = useProductSelections();

  const soldOut = product.inventory.status === "out_of_stock";
  const defaultVariant = product.variants[0];
  const wishlisted = isWishlisted(product.id);
  const comparing = isComparing(product.id);

  return (
    <article
      className={cn(
        "group flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card shadow-card transition-shadow hover:shadow-card-hover",
        className,
      )}
    >
      <div className="relative">
        <Link
          to="/product/$handle"
          params={{ handle: product.handle }}
          className="block aspect-square overflow-hidden bg-muted"
          onClick={() => onSelect?.(product)}
        >
          <ProductImage
            src={product.images[0]}
            alt={product.title}
            className="h-full w-full transition-transform duration-300 group-hover:scale-[1.02]"
          />
        </Link>

        <div className="absolute right-2 top-2 flex flex-col gap-1.5">
          <button
            type="button"
            onClick={() => toggleWishlist(product.id)}
            aria-label={wishlisted ? `Remove ${product.title} from wishlist` : `Save ${product.title} to wishlist`}
            aria-pressed={wishlisted}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-card transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Heart className={cn("h-4 w-4", wishlisted && "fill-destructive text-destructive")} />
          </button>
          {!compact ? (
            <button
              type="button"
              onClick={() => toggleCompare(product.id)}
              aria-label={comparing ? `Remove ${product.title} from comparison` : `Compare ${product.title}`}
              aria-pressed={comparing}
              className={cn(
                "inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card shadow-card transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                comparing ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Scale className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        {product.brand ? (
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {product.brand}
          </p>
        ) : null}
        <Link
          to="/product/$handle"
          params={{ handle: product.handle }}
          className="line-clamp-2 text-sm font-medium leading-snug text-foreground hover:underline"
          onClick={() => onSelect?.(product)}
        >
          {product.title}
        </Link>
        {!compact && product.shortDescription ? (
          <p className="line-clamp-2 text-xs text-muted-foreground">{product.shortDescription}</p>
        ) : null}

        {product.rating !== undefined ? (
          <RatingStars rating={product.rating} reviewCount={product.reviewCount} />
        ) : null}
        <PriceBlock price={product.price} compareAtPrice={product.compareAtPrice} />
        <StockBadge inventory={product.inventory} />

        <div className="mt-auto pt-3">
          <Button
            className="w-full"
            variant={soldOut ? "outline" : "default"}
            size="sm"
            disabled={soldOut || isMutating || !defaultVariant}
            onClick={() => {
              if (!defaultVariant) return;
              void addItem(
                { productId: product.id, variantId: defaultVariant.id, quantity: 1 },
                product.title,
              );
            }}
          >
            {soldOut ? "Out of stock" : "Add to Cart"}
          </Button>
        </div>
      </div>
    </article>
  );
}
