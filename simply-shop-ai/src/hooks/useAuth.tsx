import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";

import { identifyAlgoliaUser, initAlgoliaInsights } from "@/lib/algoliaInsights";
import { authService, type AuthUser } from "@/services/api/auth";

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: () => void;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const AUTH_KEY = ["auth", "me"] as const;

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: AUTH_KEY,
    queryFn: () => authService.me(),
    staleTime: 60_000,
    retry: false,
  });

  useEffect(() => {
    initAlgoliaInsights();
  }, []);

  const userId = data?.authenticated ? data.user?.id : undefined;
  useEffect(() => {
    if (userId) identifyAlgoliaUser(userId);
  }, [userId]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: data?.authenticated ? (data.user ?? null) : null,
      isAuthenticated: data?.authenticated === true,
      isLoading,
      signIn: () => authService.signInWithGoogle(),
      signOut: async () => {
        try {
          await authService.signOut();
        } finally {
          queryClient.setQueryData(AUTH_KEY, { authenticated: false });
          await queryClient.invalidateQueries({ queryKey: AUTH_KEY });
        }
      },
      refresh: async () => {
        await queryClient.invalidateQueries({ queryKey: AUTH_KEY });
      },
    }),
    [data, isLoading, queryClient],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    // Defensive fallback for SSR/hydration edge cases where the provider
    // tree may not be available during a brief render pass.
    return {
      user: null,
      isAuthenticated: false,
      isLoading: false,
      signIn: () => authService.signInWithGoogle(),
      signOut: async () => {},
      refresh: async () => {},
    };
  }
  return context;
}
