import { apiRequest, isApiConfigured } from "./http";

/**
 * Interaction events for the backend's personalization pipeline.
 *
 * The authenticated user is derived from the backend session — the frontend
 * never sends or invents a user_id, and the backend generates event ids.
 * Only events with real semantics are emitted (VIEW, SEARCH, ADD_TO_CART —
 * the latter only after a successful backend cart mutation). PURCHASE is
 * deliberately not sent until it maps to a real payment operation.
 */

export type InteractionEventType = "VIEW" | "SEARCH" | "ADD_TO_CART";

const SESSION_KEY = "commerceai.sessionId";

/** Stable per-browser session identifier, reused across events. */
export function getSessionId(): string {
  if (typeof window === "undefined") return "ssr";
  try {
    const existing = window.localStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const generated =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `sess_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    window.localStorage.setItem(SESSION_KEY, generated);
    return generated;
  } catch {
    return "anonymous-session";
  }
}

export interface InteractionInput {
  eventType: InteractionEventType;
  /** Only set when the event genuinely concerns a specific product. */
  productId?: string | undefined;
  context?: Record<string, unknown> | undefined;
}

export const interactionsService = {
  async record(input: InteractionInput): Promise<void> {
    if (!isApiConfigured()) return;
    const body: Record<string, unknown> = {
      eventType: input.eventType,
      sessionId: getSessionId(),
      context: { source: "storefront", ...(input.context ?? {}) },
    };
    if (input.productId) body["productId"] = input.productId;

    try {
      await apiRequest<unknown>("/interactions", { method: "POST", body });
    } catch {
      // Tracking must never break the shopping experience.
    }
  },

  async mine(): Promise<unknown[]> {
    if (!isApiConfigured()) return [];
    return apiRequest<unknown[]>("/interactions/me");
  },
};
