import { cn } from "@/lib/utils";
import type { OrderStatus } from "@/types/commerce";

const CONFIG: Record<OrderStatus, { label: string; className: string }> = {
  processing: { label: "Processing", className: "bg-muted text-muted-foreground" },
  confirmed: { label: "Confirmed", className: "bg-accent text-accent-foreground" },
  shipped: { label: "Shipped", className: "bg-accent text-accent-foreground" },
  delivered: { label: "Delivered", className: "bg-success/10 text-success" },
  payment_failed: { label: "Payment failed", className: "bg-destructive/10 text-destructive" },
  cancelled: { label: "Cancelled", className: "bg-muted text-muted-foreground" },
};

export function OrderStatusBadge({ status, className }: { status: OrderStatus; className?: string }) {
  const config = CONFIG[status];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        config.className,
        className,
      )}
    >
      {config.label}
    </span>
  );
}
