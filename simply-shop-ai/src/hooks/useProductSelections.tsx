import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";

/**
 * Wishlist and comparison are local shopper conveniences.
 * They store product ids only; product data always comes from the API.
 */

const WISHLIST_KEY = "commerceai.wishlist.v1";
const COMPARE_KEY = "commerceai.compare.v1";
const MAX_COMPARE = 4;

interface SelectionsValue {
  wishlist: string[];
  compare: string[];
  toggleWishlist: (productId: string) => void;
  isWishlisted: (productId: string) => boolean;
  toggleCompare: (productId: string) => void;
  isComparing: (productId: string) => boolean;
  clearCompare: () => void;
}

const SelectionsContext = createContext<SelectionsValue | null>(null);

function readIds(key: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function ProductSelectionsProvider({ children }: { children: ReactNode }) {
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [compare, setCompare] = useState<string[]>([]);

  useEffect(() => {
    setWishlist(readIds(WISHLIST_KEY));
    setCompare(readIds(COMPARE_KEY));
  }, []);

  const persist = useCallback((key: string, ids: string[]) => {
    if (typeof window !== "undefined") window.localStorage.setItem(key, JSON.stringify(ids));
  }, []);

  const value = useMemo<SelectionsValue>(
    () => ({
      wishlist,
      compare,
      isWishlisted: (productId) => wishlist.includes(productId),
      isComparing: (productId) => compare.includes(productId),
      toggleWishlist: (productId) => {
        setWishlist((current) => {
          const next = current.includes(productId)
            ? current.filter((id) => id !== productId)
            : [...current, productId];
          persist(WISHLIST_KEY, next);
          toast.success(current.includes(productId) ? "Removed from wishlist" : "Saved to wishlist");
          return next;
        });
      },
      toggleCompare: (productId) => {
        setCompare((current) => {
          if (current.includes(productId)) {
            const next = current.filter((id) => id !== productId);
            persist(COMPARE_KEY, next);
            return next;
          }
          if (current.length >= MAX_COMPARE) {
            toast.error(`You can compare up to ${MAX_COMPARE} products.`);
            return current;
          }
          const next = [...current, productId];
          persist(COMPARE_KEY, next);
          return next;
        });
      },
      clearCompare: () => {
        setCompare([]);
        persist(COMPARE_KEY, []);
      },
    }),
    [wishlist, compare, persist],
  );

  return <SelectionsContext.Provider value={value}>{children}</SelectionsContext.Provider>;
}

export function useProductSelections(): SelectionsValue {
  const context = useContext(SelectionsContext);
  if (!context) throw new Error("useProductSelections must be used inside ProductSelectionsProvider");
  return context;
}
