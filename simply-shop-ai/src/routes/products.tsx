import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { SlidersHorizontal } from "lucide-react";
import { useState } from "react";

import { ProductGrid } from "@/components/commerce/ProductGrid";
import { EmptyState, ErrorState } from "@/components/commerce/StateBlocks";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { formatPrice } from "@/lib/format";
import {
  DEFAULT_PRODUCT_SEARCH,
  PRICE_CEILING,
  PRICE_FLOOR,
  SORT_LABELS,
  parseProductSearch,
  toProductQuery,
  type ProductSearchParams,
} from "@/lib/product-search";
import { productsService } from "@/services/api/products";
import type { SortOption } from "@/types/commerce";

export const Route = createFileRoute("/products")({
  validateSearch: parseProductSearch,
  head: () => ({
    meta: [
      { title: "All products — CommerceAI" },
      {
        name: "description",
        content:
          "Browse the full CommerceAI catalogue. Filter by category, price and availability, then sort by price or popularity.",
      },
      { property: "og:title", content: "All products — CommerceAI" },
      {
        property: "og:description",
        content: "Filter by category, price and availability across the full catalogue.",
      },
    ],
  }),
  component: ProductsPage,
});

function FilterPanel({
  params,
  onChange,
}: {
  params: ProductSearchParams;
  onChange: (next: Partial<ProductSearchParams>) => void;
}) {
  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => productsService.categories(),
    staleTime: 300_000,
  });

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Label htmlFor="filter-search">Search</Label>
        <Input
          id="filter-search"
          type="search"
          placeholder="Search this catalogue"
          value={params.q}
          onChange={(event) => onChange({ q: event.target.value })}
        />
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Category</legend>
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => onChange({ category: "" })}
            className={`block w-full rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
              params.category === "" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            All categories
          </button>
          {(categories ?? []).map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => onChange({ category: category.slug })}
              className={`block w-full rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                params.category === category.slug
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-sm font-medium">Price range</legend>
        <Slider
          value={[params.min, params.max]}
          min={PRICE_FLOOR}
          max={PRICE_CEILING}
          step={1000}
          onValueChange={([min, max]) => onChange({ min: min ?? PRICE_FLOOR, max: max ?? PRICE_CEILING })}
          aria-label="Price range"
        />
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{formatPrice(params.min)}</span>
          <span>{params.max >= PRICE_CEILING ? `${formatPrice(PRICE_CEILING)}+` : formatPrice(params.max)}</span>
        </div>
      </fieldset>

      <div className="flex items-center gap-2">
        <Checkbox
          id="in-stock"
          checked={params.inStock}
          onCheckedChange={(checked) => onChange({ inStock: checked === true })}
        />
        <Label htmlFor="in-stock" className="text-sm font-normal">
          In stock only
        </Label>
      </div>

      <Button variant="outline" className="w-full" onClick={() => onChange(DEFAULT_PRODUCT_SEARCH)}>
        Reset filters
      </Button>
    </div>
  );
}

function ProductsPage() {
  const params = Route.useSearch();
  const navigate = Route.useNavigate();
  const [filtersOpen, setFiltersOpen] = useState(false);

  const update = (next: Partial<ProductSearchParams>) => {
    void navigate({ to: ".", search: (previous) => ({ ...previous, ...next }) });
  };

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["products", params],
    queryFn: () => productsService.list(toProductQuery(params)),
  });

  const products = data?.products ?? [];

  return (
    <div className="container-page py-8 md:py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Products</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isLoading ? "Loading products…" : `${data?.total ?? 0} products available`}
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <FilterPanel params={params} onChange={update} />
        </aside>

        <div>
          <div className="mb-5 flex items-center justify-between gap-3">
            <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 lg:hidden">
                  <SlidersHorizontal className="h-4 w-4" />
                  Filters
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 overflow-y-auto">
                <SheetHeader>
                  <SheetTitle className="text-left">Filters</SheetTitle>
                </SheetHeader>
                <div className="mt-6">
                  <FilterPanel params={params} onChange={update} />
                </div>
              </SheetContent>
            </Sheet>

            <div className="ml-auto flex items-center gap-2">
              <Label htmlFor="sort" className="text-sm text-muted-foreground">
                Sort by
              </Label>
              <Select value={params.sort} onValueChange={(value) => update({ sort: value as SortOption })}>
                <SelectTrigger id="sort" className="w-[190px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SORT_LABELS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {isError ? (
            <ErrorState onRetry={() => void refetch()} />
          ) : !isLoading && products.length === 0 ? (
            <EmptyState
              title="No products match these filters"
              description="Try widening the price range or clearing the category filter."
              action={
                <Button variant="outline" onClick={() => update(DEFAULT_PRODUCT_SEARCH)}>
                  Reset filters
                </Button>
              }
            />
          ) : (
            <ProductGrid
              products={products}
              isLoading={isLoading}
              skeletonCount={9}
              columnsClassName="grid-cols-2 xl:grid-cols-3"
            />
          )}
        </div>
      </div>
    </div>
  );
}
