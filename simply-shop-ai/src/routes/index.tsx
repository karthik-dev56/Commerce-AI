import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, PackageCheck, RotateCcw, ShieldCheck, Truck } from "lucide-react";

import { RecommendationSection } from "@/components/commerce/RecommendationSection";
import { SectionHeader } from "@/components/commerce/SectionHeader";
import { SmartSearchBar } from "@/components/commerce/SmartSearchBar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DEFAULT_PRODUCT_SEARCH } from "@/lib/product-search";
import { productsService } from "@/services/api/products";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CommerceAI — Find the right product for you" },
      {
        name: "description",
        content:
          "Shop laptops, monitors, audio, appliances, furniture and fashion with personalised recommendations and fast nationwide delivery.",
      },
      { property: "og:title", content: "CommerceAI — Find the right product for you" },
      {
        property: "og:description",
        content:
          "Shop smarter with personalised recommendations based on what you actually need.",
      },
    ],
  }),
  component: HomePage,
});

const TRUST_POINTS = [
  { icon: Truck, label: "Free delivery over ₹999" },
  { icon: RotateCcw, label: "14-day easy returns" },
  { icon: ShieldCheck, label: "Secure payments" },
  { icon: PackageCheck, label: "Genuine products" },
];

function CategoryCards() {
  const { data, isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: () => productsService.categories(),
    staleTime: 300_000,
  });

  return (
    <section>
      <SectionHeader title="Popular categories" linkTo="/categories" linkLabel="All categories" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        {isLoading
          ? Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-28 w-full rounded-lg" />
            ))
          : (data ?? []).map((category) => (
              <Link
                key={category.id}
                to="/products"
                search={{ ...DEFAULT_PRODUCT_SEARCH, category: category.slug }}
                className="flex h-28 flex-col justify-between rounded-lg border border-border bg-card p-4 transition-shadow hover:shadow-card-hover"
              >
                <span className="text-sm font-medium">{category.name}</span>
                <span className="flex items-center justify-between text-xs text-muted-foreground">
                  {category.productCount ?? 0} {category.productCount === 1 ? "product" : "products"}
                  <ArrowRight className="h-4 w-4" />
                </span>
              </Link>
            ))}
      </div>
    </section>
  );
}

function HomePage() {
  return (
    <div className="pb-4">
      <section className="border-b border-border bg-surface">
        <div className="container-page grid gap-10 py-14 md:py-20 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center">
          <div>
            <h1 className="max-w-xl text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
              Find the right product for you.
            </h1>
            <p className="mt-4 max-w-lg text-base text-muted-foreground md:text-lg">
              Shop smarter with personalized recommendations based on what you need.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/products" search={DEFAULT_PRODUCT_SEARCH}>
                  Shop Products
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/categories">Explore Categories</Link>
              </Button>
            </div>

            <div className="mt-10 max-w-xl">
              <SmartSearchBar size="lg" showSuggestions />
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-6">
            <p className="text-sm font-semibold">Why shop with us</p>
            <ul className="mt-4 space-y-4">
              {TRUST_POINTS.map((point) => (
                <li key={point.label} className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span className="flex h-9 w-9 items-center justify-center rounded-md bg-accent text-accent-foreground">
                    <point.icon className="h-4 w-4" />
                  </span>
                  {point.label}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <div className="container-page space-y-16 py-14">
        <CategoryCards />
        <RecommendationSection slot="home_for_you" />
        <RecommendationSection
          slot="home_popular"
          skeletonCount={8}
          columnsClassName="grid-cols-2 md:grid-cols-3 xl:grid-cols-4"
        />
        <RecommendationSection slot="home_complete_setup" />
      </div>
    </div>
  );
}
