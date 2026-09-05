import { cn } from "@/lib/utils";
import type { Inventory } from "@/types/commerce";

const LABELS: Record<Inventory["status"], string> = {
  in_stock: "In stock",
  low_stock: "Only a few left",
  out_of_stock: "Out of stock",
};

export function StockBadge({
  inventory,
  className,
  showDelivery = false,
}: {
  inventory: Inventory;
  className?: string;
  showDelivery?: boolean;
}) {
  const tone =
    inventory.status === "in_stock"
      ? "text-success"
      : inventory.status === "low_stock"
        ? "text-warning"
        : "text-muted-foreground";

  return (
    <div className={cn("flex flex-wrap items-center gap-x-2 gap-y-1 text-xs", className)}>
      <span className={cn("inline-flex items-center gap-1.5 font-medium", tone)}>
        <span
          aria-hidden="true"
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            inventory.status === "in_stock"
              ? "bg-success"
              : inventory.status === "low_stock"
                ? "bg-warning"
                : "bg-border-strong",
          )}
        />
        {LABELS[inventory.status]}
        {inventory.status === "low_stock" && inventory.quantity !== undefined
          ? ` (${inventory.quantity})`
          : ""}
      </span>
      {showDelivery && inventory.deliveryEstimate ? (
        <span className="text-muted-foreground">{inventory.deliveryEstimate}</span>
      ) : null}
    </div>
  );
}
