import { useEffect, type ReactNode } from "react";
import { Spinner } from "component-lib/spinner";
import { clearCache, invalidate, useQuery } from "../api/cache";
import { api, onUnauthorized } from "../api/client";
import { fetchSession } from "../api/queries";
import { ChangePassword } from "../pages/ChangePassword";
import { Login } from "../pages/Login";
import { Setup } from "../pages/Setup";
import { can } from "../shared/rbac";
import { AuthContext } from "./context";

const fetchAuthStatus =() => api<{ setupRequired: boolean }>("/auth/status");

/**
 * Decides what a visitor sees before the app:
 * - a brand-new install shows workspace setup, which creates the first (owner) account;
 * - otherwise sign-in, until there is a session;
 * - an account an admin created, or reset, must choose its own password first.
 * Any 401 from the API drops back to sign-in.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const status = useQuery("auth-status", fetchAuthStatus);
  const ready = status.data?.setupRequired === false;
  const { data: session, error } = useQuery(ready ? "session" : null, fetchSession);

  useEffect(() => onUnauthorized(() => invalidate("session")), []);

  if (status.error) return <Boot message={status.error.message} />;
  if (!status.data) return <Boot />;
  if (status.data.setupRequired) return <Setup />;
  if (!session && !error) return <Boot />;
  if (!session) return <Login />;

  const logout = async () => {
    await api("/auth/logout", { method: "POST" }).catch(() => undefined);
    clearCache();
  };

  const value = { user: session.user, workspace: session.workspace, can: (p: Parameters<typeof can>[1]) => can(session.user.role, p), logout };

  return (
    <AuthContext.Provider value={value}>
      {session.user.mustChangePassword ? <ChangePassword /> : children}
    </AuthContext.Provider>
  );
}

function Boot({ message }: { message?: string }) {
  return (
    <div className="boot">
      {message ? <p className="muted">{message}</p> : <Spinner label="Loading your workspace" showLabel />}
    </div>
  );
}
