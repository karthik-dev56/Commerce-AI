import { ImageOff } from "lucide-react";

import { cn } from "@/lib/utils";

interface ProductImageProps {
  src?: string | undefined;
  alt: string;
  className?: string;
  loading?: "lazy" | "eager";
}

/**
 * Renders a real product image, or a neutral placeholder when the catalogue
 * does not provide one. Images are never fabricated.
 */
export function ProductImage({ src, alt, className, loading = "lazy" }: ProductImageProps) {
  if (!src) {
    return (
      <div
        role="img"
        aria-label={`${alt} — no image available`}
        className={cn(
          "flex flex-col items-center justify-center gap-2 bg-muted text-muted-foreground",
          className,
        )}
      >
        <ImageOff aria-hidden="true" className="h-6 w-6" />
        <span className="px-3 text-center text-[11px] leading-tight">No image available</span>
      </div>
    );
  }

  return <img src={src} alt={alt} loading={loading} className={cn("object-cover", className)} />;
}
