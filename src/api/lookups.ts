import type { User } from "../shared/types";
import { useUsers } from "./queries";

/** Resolve user ids to people. Returns undefined for an id until users have loaded. */
export function useUserLookup() {
  const { data } = useUsers();
  const byId = new Map((data ?? []).map((u) => [u.id, u]));
  return (id: string | null | undefined): User | undefined => (id ? byId.get(id) : undefined);
}
