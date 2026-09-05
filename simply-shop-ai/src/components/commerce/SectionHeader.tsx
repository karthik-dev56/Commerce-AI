import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import type { ReactNode } from "react";

interface SectionHeaderProps {
  title: string;
  note?: string | undefined;
  action?: ReactNode;
  linkTo?: "/products" | "/categories";
  linkLabel?: string;
}

export function SectionHeader({ title, note, action, linkTo, linkLabel }: SectionHeaderProps) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-xl font-semibold tracking-tight md:text-2xl">{title}</h2>
        {note ? <p className="mt-1 text-sm text-muted-foreground">{note}</p> : null}
      </div>
      {action}
      {linkTo ? (
        <Link
          to={linkTo}
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          {linkLabel ?? "View all"}
          <ArrowRight className="h-4 w-4" />
        </Link>
      ) : null}
    </div>
  );
}
