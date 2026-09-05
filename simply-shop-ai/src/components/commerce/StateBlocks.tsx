import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";

interface StateBlockProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}

export function EmptyState({ title, description, icon, action }: StateBlockProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-surface px-6 py-16 text-center">
      {icon ? <div className="mb-4 text-muted-foreground">{icon}</div> : null}
      <h3 className="text-base font-semibold">{title}</h3>
      {description ? (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  description = "We couldn't load this right now. Please try again.",
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-surface px-6 py-16 text-center">
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      {onRetry ? (
        <Button className="mt-5" variant="outline" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}
