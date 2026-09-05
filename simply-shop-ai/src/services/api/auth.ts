import { API_BASE_URL, apiRequest, isApiConfigured } from "./http";

/**
 * Authentication is owned entirely by the backend (Google OAuth +
 * express-session). The frontend never stores tokens and never talks to
 * Google directly — the server session is the source of truth.
 */

export interface AuthUser {
  id: string;
  email?: string | undefined;
  name?: string | undefined;
  picture?: string | undefined;
}

export interface AuthState {
  authenticated: boolean;
  user?: AuthUser | undefined;
}

export const authService = {
  /** Reads the current session from the backend. */
  async me(): Promise<AuthState> {
    if (!isApiConfigured()) return { authenticated: false };
    return apiRequest<AuthState>("/auth/me");
  },

  /** Full-page navigation to the backend's Google OAuth entry point. */
  signInWithGoogle(): void {
    if (typeof window === "undefined" || !isApiConfigured()) return;
    const base = API_BASE_URL.replace(/\/?$/, "");
    window.location.href = `${base}/auth/google`;
  },

  /**
   * Ends the backend session. Logout must never surface an error to the UI:
   * the local session state is cleared regardless of the backend response.
   */
  async signOut(): Promise<void> {
    if (!isApiConfigured()) return;
    try {
      await apiRequest<unknown>("/auth/logout", { method: "POST" });
    } catch {
      // Older backends expose logout as a GET route; try it before giving up.
      try {
        await apiRequest<unknown>("/auth/logout", { method: "GET" });
      } catch {
        /* session is cleared locally either way */
      }
    }
  },
};
