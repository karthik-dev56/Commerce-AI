import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { Heart, Minus, Plus, Scale, Truck } from "lucide-react";
import { useMemo, useState, useEffect } from "react";

import { PriceBlock } from "@/components/commerce/PriceBlock";
import { ProductImage } from "@/components/commerce/ProductImage";
import { RatingStars } from "@/components/commerce/RatingStars";
import { RecommendationSection } from "@/components/commerce/RecommendationSection";
import { GrowthOffer } from "@/components/commerce/GrowthOffer";
import { ValidatedRecommendations } from "@/components/commerce/ValidatedRecommendations";
import { StockBadge } from "@/components/commerce/StockBadge";
import { EmptyState } from "@/components/commerce/StateBlocks";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useCart } from "@/hooks/useCart";
import { trackProductViewed } from "@/lib/algoliaInsights";
import { interactionsService } from "@/services/api/interactions";
import { useProductSelections } from "@/hooks/useProductSelections";
import { cn } from "@/lib/utils";
import { productsService } from "@/services/api/products";
import type { Product } from "@/types/commerce";

export const Route = createFileRoute("/product/$handle")({
  loader: async ({ params }) => {
    const product = await productsService.getByHandle(params.handle);
    if (!product) throw notFound();
    return { product };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "Product unavailable — CommerceAI" }, { name: "robots", content: "noindex" }],
      };
    }
    const { product } = loaderData;
    const title = `${product.title} — CommerceAI`;
    return {
      meta: [
        { title },
        { name: "description", content: product.shortDescription },
        { property: "og:title", content: title },
        { property: "og:description", content: product.shortDescription },
      ],
    };
  },
  notFoundComponent: ProductNotFound,
  component: ProductDetailPage,
});

function ProductNotFound() {
  return (
    <div className="container-page py-16">
      <EmptyState
        title="Product not found"
        description="This product may have been removed or is no longer available."
        action={
          <Button asChild>
            <Link to="/products" search={{ q: "", category: "", sort: "relevance", min: 0, max: 100000, inStock: false }}>
              Browse products
            </Link>
          </Button>
        }
      />
    </div>
  );
}

function QuantityStepper({
  value,
  onChange,
  max = 10,
}: {
  value: number;
  onChange: (next: number) => void;
  max?: number;
}) {
  return (
    <div className="inline-flex items-center rounded-md border border-input">
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 rounded-r-none"
        aria-label="Decrease quantity"
        disabled={value <= 1}
        onClick={() => onChange(value - 1)}
      >
        <Minus className="h-4 w-4" />
      </Button>
      <span className="w-10 text-center text-sm font-medium" aria-live="polite">
        {value}
      </span>
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 rounded-l-none"
        aria-label="Increase quantity"
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}

function ProductDetail({ product }: { product: Product }) {
  const navigate = useNavigate();
  const { addItem, isMutating } = useCart();
  const { isWishlisted, toggleWishlist, isComparing, toggleCompare } = useProductSelections();

  useEffect(() => {
    void interactionsService.record({
      eventType: "VIEW",
      productId: product.id,
      context: { page: "product-detail" },
    });
    trackProductViewed(product.id);
  }, [product.id]);

  const [variantId, setVariantId] = useState(product.variants[0]?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);

  const variant = useMemo(
    () => product.variants.find((candidate) => candidate.id === variantId) ?? product.variants[0],
    [product.variants, variantId],
  );

  const inventory = variant?.inventory ?? product.inventory;
  const soldOut = inventory.status === "out_of_stock";
  const optionName = product.variants[0]?.optionName ?? "Option";

  async function handleAdd() {
    if (!variant) return;
    await addItem({ productId: product.id, variantId: variant.id, quantity }, product.title);
  }

  async function handleBuyNow() {
    await handleAdd();
    void navigate({ to: "/checkout" });
  }

  return (
    <div className="container-page py-8 md:py-10">
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted-foreground">
        <Link to="/" className="hover:text-foreground">
          Home
        </Link>
        <span className="px-2">/</span>
        <Link
          to="/products"
          search={{ q: "", category: product.categorySlug, sort: "relevance", min: 0, max: 100000, inStock: false }}
          className="hover:text-foreground"
        >
          {product.categoryName}
        </Link>
        <span className="px-2">/</span>
        <span className="text-foreground">{product.title}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2">
        <div>
          <div className="overflow-hidden rounded-lg border border-border bg-muted">
            <ProductImage
              src={product.images[activeImage] ?? product.images[0]}
              alt={product.title}
              loading="eager"
              className="aspect-square w-full"
            />
          </div>
          {product.images.length > 1 ? (
            <div className="mt-3 flex gap-3">
              {product.images.map((image, index) => (
                <button
                  key={image}
                  type="button"
                  onClick={() => setActiveImage(index)}
                  aria-label={`View image ${index + 1}`}
                  className={cn(
                    "h-20 w-20 overflow-hidden rounded-md border",
                    index === activeImage ? "border-primary" : "border-border",
                  )}
                >
                  <img src={image} alt="" loading="lazy" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div>
          {product.brand ? (
            <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              {product.brand}
            </p>
          ) : null}
          <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">{product.title}</h1>
          {product.rating !== undefined ? (
            <div className="mt-3">
              <RatingStars rating={product.rating} reviewCount={product.reviewCount} size="md" />
            </div>
          ) : null}

          <div className="mt-5">
            <PriceBlock
              price={variant?.price ?? product.price}
              compareAtPrice={variant?.compareAtPrice ?? product.compareAtPrice}
              size="lg"
            />
            <p className="mt-1 text-xs text-muted-foreground">Inclusive of all taxes</p>
          </div>

          <div className="mt-4">
            <StockBadge inventory={inventory} showDelivery />
          </div>

          {product.variants.length > 1 ? (
            <fieldset className="mt-6">
              <legend className="text-sm font-medium">{optionName}</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {product.variants.map((option) => {
                  const unavailable = option.inventory.status === "out_of_stock";
                  return (
                    <button
                      key={option.id}
                      type="button"
                      disabled={unavailable}
                      onClick={() => setVariantId(option.id)}
                      className={cn(
                        "rounded-md border px-3 py-2 text-sm transition-colors",
                        option.id === variant?.id
                          ? "border-primary bg-accent text-accent-foreground"
                          : "border-border text-muted-foreground hover:border-border-strong hover:text-foreground",
                        unavailable && "cursor-not-allowed opacity-50 line-through",
                      )}
                    >
                      {option.title}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ) : null}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium">Quantity</span>
            <QuantityStepper value={quantity} onChange={setQuantity} />
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button
              size="lg"
              className="flex-1 sm:flex-none"
              disabled={soldOut || isMutating}
              onClick={() => void handleAdd()}
            >
              {soldOut ? "Out of stock" : "Add to Cart"}
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="flex-1 sm:flex-none"
              disabled={soldOut || isMutating}
              onClick={() => void handleBuyNow()}
            >
              Buy Now
            </Button>
            <Button
              size="lg"
              variant="ghost"
              aria-label="Save to wishlist"
              aria-pressed={isWishlisted(product.id)}
              onClick={() => toggleWishlist(product.id)}
            >
              <Heart
                className={cn("h-5 w-5", isWishlisted(product.id) && "fill-destructive text-destructive")}
              />
            </Button>
            <Button
              size="lg"
              variant="ghost"
              aria-label="Add to comparison"
              aria-pressed={isComparing(product.id)}
              onClick={() => toggleCompare(product.id)}
            >
              <Scale className={cn("h-5 w-5", isComparing(product.id) && "text-primary")} />
            </Button>
          </div>

          <div className="mt-6">
            <GrowthOffer
              productId={product.id}
              currentProductPrice={product.price}
              category={product.categorySlug}
            />
          </div>

          {product.shippingInfo ? (
            <div className="mt-6 flex items-start gap-3 rounded-md border border-border bg-surface p-4 text-sm text-muted-foreground">
              <Truck className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{product.shippingInfo}</span>
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-14 grid gap-10 lg:grid-cols-2">
        <section>
          <h2 className="text-lg font-semibold">Product description</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{product.description}</p>
          {product.shippingInfo ? (
            <>
              <Separator className="my-6" />
              <h2 className="text-lg font-semibold">Shipping and returns</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {product.shippingInfo}
              </p>
            </>
          ) : null}
        </section>

        <section>
          <h2 className="text-lg font-semibold">Specifications</h2>
          <dl className="mt-3 divide-y divide-border overflow-hidden rounded-lg border border-border">
            {product.specifications.map((spec) => (
              <div key={spec.label} className="grid grid-cols-2 gap-4 px-4 py-3 text-sm">
                <dt className="text-muted-foreground">{spec.label}</dt>
                <dd className="font-medium">{spec.value}</dd>
              </div>
            ))}
            <div className="grid grid-cols-2 gap-4 px-4 py-3 text-sm">
              <dt className="text-muted-foreground">Availability</dt>
              <dd className="font-medium">
                <StockBadge inventory={inventory} />
              </dd>
            </div>
          </dl>
        </section>
      </div>

      <div className="mt-16 space-y-16">
        <ValidatedRecommendations productId={product.id} constraints={{ inStockOnly: true }} />
        <RecommendationSection slot="product_bought_together" contextProductIds={[product.id]} skeletonCount={3} />
        <RecommendationSection slot="product_related" contextProductIds={[product.id]} />
      </div>
    </div>
  );
}

function ProductDetailPage() {
  const { handle } = Route.useParams();
  const { product } = Route.useLoaderData();

  const { data } = useQuery({
    queryKey: ["product", handle],
    queryFn: () => productsService.getByHandle(handle),
    initialData: product,
  });

  if (!data) {
    return (
      <div className="container-page py-10">
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return <ProductDetail product={data} />;
}
