import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { cartService, type AddToCartInput } from "@/services/api/cart";
import { interactionsService } from "@/services/api/interactions";
import type { Cart } from "@/types/commerce";

interface CartContextValue {
  cart: Cart | undefined;
  itemCount: number;
  isLoading: boolean;
  isMutating: boolean;
  /** Line item id currently being mutated, so the UI can lock just that row. */
  pendingLineId: string | null;
  addItem: (input: AddToCartInput, productTitle?: string) => Promise<void>;
  updateQuantity: (lineId: string, quantity: number) => Promise<void>;
  removeItem: (lineId: string) => Promise<void>;
  clear: () => Promise<void>;
}

const CartContext = createContext<CartContextValue | null>(null);

const CART_KEY = ["cart"] as const;

export function CartProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [pendingLineId, setPendingLineId] = useState<string | null>(null);

  const { data: cart, isLoading } = useQuery({
    queryKey: CART_KEY,
    queryFn: () => cartService.get(),
    staleTime: 30_000,
  });

  const setCart = useCallback(
    (next: Cart) => queryClient.setQueryData(CART_KEY, next),
    [queryClient],
  );

  const addMutation = useMutation({
    mutationFn: (input: AddToCartInput) => cartService.addItem(input),
  });
  const updateMutation = useMutation({
    mutationFn: ({ lineId, quantity }: { lineId: string; quantity: number }) =>
      cartService.updateQuantity(lineId, quantity),
  });
  const removeMutation = useMutation({
    mutationFn: (lineId: string) => cartService.removeItem(lineId),
  });
  const clearMutation = useMutation({ mutationFn: () => cartService.clear() });

  const value = useMemo<CartContextValue>(
    () => ({
      cart,
      itemCount: cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0,
      isLoading,
      isMutating:
        addMutation.isPending ||
        updateMutation.isPending ||
        removeMutation.isPending ||
        clearMutation.isPending,
      addItem: async (input, productTitle) => {
        try {
          setCart(await addMutation.mutateAsync(input));
          toast.success(productTitle ? `${productTitle} added to cart` : "Added to cart");
          void interactionsService.record({
            eventType: "ADD_TO_CART",
            productId: input.productId,
            context: { variantId: input.variantId, quantity: input.quantity },
          });
        } catch {
          toast.error("We couldn't add this item. Please try again.");
        }
      },
      pendingLineId,
      updateQuantity: async (lineId, quantity) => {
        if (pendingLineId) return; // one mutation at a time per cart
        setPendingLineId(lineId);
        try {
          // The backend answer (or an immediate re-read of the cart) is the
          // single source of truth for quantities, prices and totals.
          const authoritative = await updateMutation.mutateAsync({ lineId, quantity });
          setCart(authoritative);
        } catch (error) {
          console.error("[cart] mutation failed", { action: "update", lineId, quantity, error });
          toast.error("We couldn't update the quantity. Please try again.");
        } finally {
          setPendingLineId(null);
        }
      },
      removeItem: async (lineId) => {
        if (pendingLineId) return;
        setPendingLineId(lineId);
        try {
          const authoritative = await removeMutation.mutateAsync(lineId);
          setCart(authoritative);
          toast.success("Item removed");
        } catch (error) {
          console.error("[cart] mutation failed", { action: "remove", lineId, error });
          toast.error("We couldn't remove this item. Please try again.");
        } finally {
          setPendingLineId(null);
        }
      },
      clear: async () => {
        setCart(await clearMutation.mutateAsync());
      },
    }),
    [
      cart,
      isLoading,
      pendingLineId,
      addMutation,
      updateMutation,
      removeMutation,
      clearMutation,
      setCart,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

/** Safe no-op cart used only when the context is momentarily unavailable. */
const FALLBACK_CART: CartContextValue = {
  cart: undefined,
  itemCount: 0,
  isLoading: true,
  isMutating: false,
  pendingLineId: null,
  addItem: async () => {},
  updateQuantity: async () => {},
  removeItem: async () => {},
  clear: async () => {},
};

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  // During SSR/hydration or a hot reload the provider can be missing for one
  // render — degrade to an empty cart instead of blanking the whole page.
  return context ?? FALLBACK_CART;
}
