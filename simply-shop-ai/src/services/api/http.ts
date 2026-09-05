import type { ApiErrorShape } from "@/types/commerce";

/**
 * Thin HTTP layer for the storefront.
 *
 * The base URL of our own backend API comes from environment configuration.
 * No provider credentials (Razorpay / Medusa / Gemini / AWS) ever live here —
 * the backend owns all of those.
 */
export const API_BASE_URL: string = (import.meta.env["VITE_API_BASE_URL"] as string) ?? "";

/** True once a real backend is configured; until then adapters serve demo data. */
export function isApiConfigured(): boolean {
  return API_BASE_URL.trim().length > 0;
}

export class ApiError extends Error implements ApiErrorShape {
  code?: string | undefined;
  status?: number | undefined;

  constructor({ message, code, status }: ApiErrorShape) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

export interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  signal?: AbortSignal;
}

function buildUrl(path: string, query?: RequestOptions["query"]): string {
  const url = new URL(path.replace(/^\//, ""), API_BASE_URL.replace(/\/?$/, "/"));
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === "") continue;
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, query, headers, ...rest } = options;

  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      ...rest,
      headers: {
        "Content-Type": "application/json",
        ...(headers ?? {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      credentials: "include",
    });
  } catch {
    throw new ApiError({
      message: "We couldn't reach the store right now. Please check your connection.",
      code: "network_error",
    });
  }

  if (!response.ok) {
    let message = "Something went wrong. Please try again.";
    let code: string | undefined;
    try {
      const payload = (await response.json()) as Partial<ApiErrorShape>;
      if (payload?.message) message = payload.message;
      if (payload?.code) code = payload.code;
    } catch {
      /* keep the safe default message */
    }
    throw new ApiError({ message, code, status: response.status });
  }

  if (response.status === 204) return undefined as T;

  // Some backend mutations answer with an empty or non-JSON body. That is a
  // success, not a failure — never turn it into an error the customer sees.
  const text = await response.text();
  if (!text.trim()) return undefined as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return undefined as T;
  }
}

/** Small latency so demo data exercises the same loading states as the API. */
export function simulateLatency<T>(value: T, ms = 220): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}
