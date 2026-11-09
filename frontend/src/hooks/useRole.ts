import { useCallback } from "react";
import { useAuth } from "../components/AuthGate";

export type Role = "VIEWER" | "OPERATOR" | "ADMIN" | "UNKNOWN";

/**
 * Role + auth-error handling. The role comes from the authenticated user
 * (session or API key), resolved once by AuthGate via /api/auth/me — never
 * inferred from 403 side-channels.
 */
export function useRole() {
  const { user, logout } = useAuth();
  const role: Role = user?.role ?? "UNKNOWN";

  const isOperator = role === "OPERATOR" || role === "ADMIN";
  const isAdmin = role === "ADMIN";

  const handleApiError = useCallback((error: unknown) => {
    const err = error as { status?: number };
    if (err?.status === 401) {
      logout();
    }
  }, [logout]);

  return { role, isOperator, isAdmin, handleApiError };
}
