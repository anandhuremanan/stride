import { createContext, useContext } from "react";
import type { Permission } from "../shared/rbac";
import type { User, Workspace } from "../shared/types";

export interface AuthValue {
  user: User;
  workspace: Workspace;
  can: (permission: Permission) => boolean;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthValue | null>(null);

/** The signed-in user. Only usable below the login gate in App. */
export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside the signed-in app");
  return value;
}
