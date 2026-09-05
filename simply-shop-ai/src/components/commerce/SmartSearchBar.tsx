import { useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SUGGESTIONS = [
  "Gaming laptop under ₹80,000",
  "Headphones for office calls",
  "Monitor under ₹20,000",
  "Complete my gaming setup",
];

interface SmartSearchBarProps {
  defaultValue?: string;
  size?: "sm" | "lg";
  showSuggestions?: boolean;
  className?: string;
  autoFocus?: boolean;
}

/**
 * A single search field that accepts plain product terms or a full sentence.
 * Submitting takes the shopper straight to product results.
 */
export function SmartSearchBar({
  defaultValue = "",
  size = "sm",
  showSuggestions = false,
  className,
  autoFocus = false,
}: SmartSearchBarProps) {
  const navigate = useNavigate();
  const [value, setValue] = useState(defaultValue);

  function submit(query: string) {
    const trimmed = query.trim();
    if (!trimmed) return;
    void navigate({ to: "/search", search: { q: trimmed } });
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    submit(value);
  }

  return (
    <div className={cn("w-full", className)}>
      <form onSubmit={handleSubmit} role="search" className="flex w-full items-center gap-2">
        <div className="relative flex-1">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="search"
            name="q"
            autoFocus={autoFocus}
            aria-label="Search products"
            placeholder="What are you looking for?"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            className={cn(
              "w-full rounded-md border border-input bg-background pl-9 pr-3 text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25",
              size === "lg" ? "h-12 text-base" : "h-10 text-sm",
            )}
          />
        </div>
        <Button type="submit" size={size === "lg" ? "lg" : "default"}>
          Search
        </Button>
      </form>

      {showSuggestions ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => {
                setValue(suggestion);
                submit(suggestion);
              }}
              className="rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
            >
              {suggestion}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
