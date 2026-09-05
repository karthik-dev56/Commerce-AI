import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import { PriceBlock } from "./PriceBlock";
import { ProductImage } from "./ProductImage";
import { StockBadge } from "./StockBadge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPrice } from "@/lib/format";
import { readCartId } from "@/services/api/cart";
import {
  growthOfferService,
  type GrowthAction,
  type GrowthOffer as GrowthOfferType,
} from "@/services/api/growth";
import { getSessionId } from "@/services/api/interactions";
import { productsService } from "@/services/api/products";
import type { Cart, Product } from "@/types/commerce";

const ACTION_LABEL: Record<Exclude<GrowthAction, "DO_NOTHING">, string> = {
  UPSELL: "Upgrade",
  CROSS_SELL: "Goes well with this",
  BUNDLE: "Bundle",
};

interface GrowthOfferProps {
  productId: string;
  currentProductPrice: number;
  category?: string | undefined;
  maxPrice?: number | undefined;
}

/** Small product tile used for both the base and the recommended item. */
function OfferProduct({
  product,
  caption,
}: {
  product: Product;
  caption?: string | undefined;
}) {
  return (
    <div className="flex min-w-0 flex-1 gap-3">
      <div className="w-20 shrink-0 overflow-hidden rounded-md border border-border bg-muted">
        <ProductImage src={product.images[0]} alt={product.title} className="aspect-square w-full" />
      </div>
      <div className="min-w-0">
        {caption ? (
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{caption}</p>
        ) : null}
        <p className="truncate text-sm font-medium">{product.title}</p>
        <div className="mt-1">
          <StockBadge inventory={product.inventory} />
        </div>
      </div>
    </div>
  );
}

/**
 * Renders the backend Growth Orchestrator's decision for the viewed product.
 * All decisioning, pricing and cart mutation happen on the backend.
 */
export function GrowthOffer({
  productId,
  currentProductPrice,
  category,
  maxPrice,
}: GrowthOfferProps) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<"open" | "accepted" | "declined">("open");
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [offer, setOffer] = useState<GrowthOfferType | null>(null);
  const createdKeyRef = useRef<string | null>(null);

  useEffect(() => {
    setSessionId(getSessionId());
    setStatus("open");
    setError(null);
    setOffer(null);
    createdKeyRef.current = null;
  }, [productId]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["growth-recommendation", productId, sessionId],
    queryFn: () =>
      growthOfferService.recommendation({
        productId,
        currentProductPrice,
        sessionId: sessionId as string,
        cartId: readCartId() ?? undefined,
      }),
    enabled: Boolean(productId && sessionId),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: false,
  });

  const action = data?.action ?? "DO_NOTHING";
  const showSection = action !== "DO_NOTHING";
  const recommendedId = data?.recommendedProductId;
  const baseId = data?.baseProductId;

  useEffect(() => {
    if (data) console.log("[growth] decision", data);
  }, [data]);

  // Offer creation is an action, not a query: it runs once per
  // product + session + decision and never on window focus.
  const createOffer = useMutation({
    mutationFn: (input: {
      decision: NonNullable<typeof data>;
      sessionId: string;
    }) =>
      growthOfferService.createOffer(input.decision, {
        productId,
        currentProductPrice,
        sessionId: input.sessionId,
        cartId: readCartId() ?? undefined,
        inStockOnly: true,
        ...(maxPrice !== undefined ? { maxPrice } : {}),
        ...(category ? { category } : {}),
      }),
    onSuccess: (created) => setOffer(created),
  });

  const createMutate = createOffer.mutate;
  useEffect(() => {
    if (!data || !sessionId || data.action === "DO_NOTHING") return;
    const key = [
      productId,
      sessionId,
      data.action,
      data.baseProductId ?? "",
      data.recommendedProductId ?? "",
    ].join("|");
    if (createdKeyRef.current === key) return;
    createdKeyRef.current = key;
    createMutate({ decision: data, sessionId });
  }, [data, sessionId, productId, createMutate]);


  // Resolve names/images from the authoritative catalog when the decision only
  // returns product ids. Failures resolve to null and are rendered gracefully.
  const { data: resolved, isLoading: resolving } = useQuery({
    queryKey: ["growth-offer-products", baseId ?? null, recommendedId ?? null],
    queryFn: async () => {
      const [base, recommended] = await Promise.all([
        baseId ? productsService.getById(baseId).catch(() => null) : Promise.resolve(null),
        recommendedId
          ? productsService.getById(recommendedId).catch(() => null)
          : Promise.resolve(null),
      ]);
      return { base, recommended };
    },
    enabled: showSection && Boolean(baseId || recommendedId),
    staleTime: 60_000,
    retry: false,
  });


  // Resolve real catalog images for bundle products by id.
  const bundleIds = (data?.products ?? []).map((p) => p.id);
  const { data: bundleImages } = useQuery({
    queryKey: ["growth-bundle-products", bundleIds.join(",")],
    queryFn: async () => {
      const items = await Promise.all(
        bundleIds.map(async (id) => {
          const product = await productsService.getById(id).catch(() => null);
          return [id, product?.images?.[0]] as const;
        }),
      );
      return Object.fromEntries(
        items.filter((entry): entry is readonly [string, string] => Boolean(entry[1])),
      ) as Record<string, string>;
    },
    enabled: action === "BUNDLE" && bundleIds.length > 0,
    staleTime: 60_000,
    retry: false,
  });

  const accept = useMutation({
    mutationFn: (offerId: string) => growthOfferService.applyOffer(offerId),
    onSuccess: (cart: Cart) => {
      queryClient.setQueryData(["cart"], cart);
      setStatus("accepted");
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : "";
      setError(
        message || "We couldn't apply this offer. Nothing was added to your cart.",
      );
    },
  });

  const decline = useMutation({
    mutationFn: (offerId: string) => growthOfferService.declineOffer(offerId),
    onSettled: () => setStatus("declined"),
  });

  if (isLoading) {
    return (
      <section className="rounded-lg border border-border bg-card p-4">
        <div className="flex gap-4">
          <Skeleton className="h-24 w-24 rounded-md" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        </div>
      </section>
    );
  }

  if (isError || !data) return null;
  if (!showSection) return null;
  if (status === "declined") return null;

  // Expiry lives on the offer created by POST /growth/offer, never on the decision.
  const expired = offer?.expiresAt ? new Date(offer.expiresAt).getTime() < Date.now() : false;
  if (expired) return null;

  const recommended = resolved?.recommended ?? data.product ?? null;
  const base = resolved?.base ?? null;
  const isBundle = action === "BUNDLE";
  const showBase = isBundle && base !== null && base.id !== recommended?.id;

  const price = data.offerAmount ?? recommended?.price;
  const outOfStock = !isBundle && recommended?.inventory.status === "out_of_stock";
  const busy = accept.isPending || decline.isPending;
  const offerRef = offer?.offerId ?? null;

  return (
    <section
      aria-label="AI Growth Opportunity"
      className="rounded-lg border border-primary/40 bg-surface p-4 md:p-5"
    >
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-semibold tracking-tight">
          {isBundle ? "AI Bundle Offer" : "AI Growth Opportunity"}
        </h2>
        <span className="rounded-full border border-primary/40 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-primary">
          {ACTION_LABEL[action as Exclude<GrowthAction, "DO_NOTHING">]}
        </span>
      </div>

      {data.reason ? (
        <p className="mt-2 text-sm text-muted-foreground">{data.reason}</p>
      ) : null}

      <div className="mt-4 space-y-3">
        {isBundle ? (
          <>
            {data.products && data.products.length > 0 ? (
              <ul className="space-y-2">
                {data.products.map((p) => {
                  const image = bundleImages?.[p.id];
                  return (
                    <li
                      key={p.id}
                      className="flex items-center justify-between gap-3 text-sm"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        {image ? (
                          <div className="w-14 shrink-0 overflow-hidden rounded-md border border-border bg-muted">
                            <ProductImage
                              src={image}
                              alt={p.name}
                              className="aspect-square w-full"
                            />
                          </div>
                        ) : null}
                        <span className="truncate font-medium">{p.name}</span>
                      </div>
                      <span className="shrink-0 text-muted-foreground">
                        {formatPrice(p.price)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                Bundle details are unavailable right now.
              </p>
            )}

            {typeof data.separateTotal === "number" &&
            typeof data.totalPrice === "number" ? (
              <div className="space-y-1 border-t border-border pt-3 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Buy separately</span>
                  <span>{formatPrice(data.separateTotal)}</span>
                </div>
                {typeof data.discountPercent === "number" &&
                data.discountPercent > 0 ? (
                  <div className="flex justify-between text-success">
                    <span>Bundle discount</span>
                    <span>{data.discountPercent}%</span>
                  </div>
                ) : null}
                {typeof data.discountAmount === "number" &&
                data.discountAmount > 0 ? (
                  <div className="flex justify-between text-success">
                    <span>You save</span>
                    <span>{formatPrice(data.discountAmount)}</span>
                  </div>
                ) : null}
                <div className="flex justify-between font-semibold text-foreground">
                  <span>Bundle price</span>
                  <span>{formatPrice(data.totalPrice)}</span>
                </div>
              </div>
            ) : null}
          </>
        ) : (
          <>
            {resolving && !recommended ? (
              <div className="flex gap-3">
                <Skeleton className="h-20 w-20 rounded-md" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-4 w-1/4" />
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4 sm:flex-row">
                {showBase && base ? (
                  <OfferProduct product={base} caption="Base product" />
                ) : null}
                {recommended ? (
                  <OfferProduct product={recommended} />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Product details are unavailable right now.
                  </p>
                )}
              </div>
            )}

            {typeof price === "number" && price > 0 ? (
              <div>
                <PriceBlock price={price} size="sm" />
              </div>
            ) : null}
          </>
        )}
      </div>

      {status === "accepted" ? (
        <p className="mt-3 text-sm font-medium text-foreground">Added to your cart.</p>
      ) : offerRef ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            size="sm"
            disabled={busy || outOfStock}
            onClick={() => {
              setError(null);
              accept.mutate(offerRef);
            }}
          >
            {outOfStock
              ? "Currently unavailable"
              : accept.isPending
                ? "Adding…"
                : "Take Offer"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() => decline.mutate(offerRef)}
          >
            Leave
          </Button>
        </div>
      ) : createOffer.isPending ? (
        <p className="mt-4 text-sm text-muted-foreground">Preparing this offer…</p>
      ) : null}

      {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
    </section>
  );
}
