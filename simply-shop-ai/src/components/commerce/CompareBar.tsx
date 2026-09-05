import { Link } from "@tanstack/react-router";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useProductSelections } from "@/hooks/useProductSelections";

/** Slim bar that appears once a shopper marks products for comparison. */
export function CompareBar() {
  const { compare, clearCompare } = useProductSelections();

  if (compare.length === 0) return null;

  return (
    <div className="sticky bottom-0 z-30 border-t border-border bg-card/95 backdrop-blur">
      <div className="container-page flex items-center justify-between gap-3 py-3">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{compare.length}</span>{" "}
          {compare.length === 1 ? "product" : "products"} selected to compare
        </p>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={clearCompare} className="gap-1">
            <X className="h-4 w-4" />
            Clear
          </Button>
          <Button asChild size="sm" disabled={compare.length < 2}>
            <Link to="/compare">Compare</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
