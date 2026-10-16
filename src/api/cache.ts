// A small query cache: one entry per key, shared by every component that asks
// for it, refetched when a mutation invalidates its key.

import { useEffect, useSyncExternalStore } from "react";

interface Entry<T = unknown> {
  data?: T;
  error?: Error;
  loading: boolean;
  stale: boolean;
}

const entries = new Map<string, Entry>();
const fetchers = new Map<string, () => Promise<unknown>>();
const inflight = new Map<string, Promise<unknown>>();
const listeners = new Set<() => void>();

const EMPTY: Entry = { loading: true, stale: true };

function emit() {
  listeners.forEach((l) => l());
}

function setEntry(key: string, patch: Partial<Entry>) {
  entries.set(key, { ...(entries.get(key) ?? EMPTY), ...patch });
  emit();
}

function load(key: string) {
  const fetcher = fetchers.get(key);
  if (!fetcher || inflight.has(key)) return;
  setEntry(key, { loading: true, stale: false });
  const promise = fetcher()
    .then((data) => setEntry(key, { data, error: undefined, loading: false }))
    .catch((error: Error) => setEntry(key, { error, loading: false }))
    .finally(() => inflight.delete(key));
  inflight.set(key, promise);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export interface QueryResult<T> {
  data: T | undefined;
  error: Error | undefined;
  /** True only while there is nothing to show yet; refetches keep the old data on screen. */
  loading: boolean;
}

export function useQuery<T>(key: string | null, fetcher: () => Promise<T>): QueryResult<T> {
  const entry = useSyncExternalStore(subscribe, () => (key ? entries.get(key) : undefined)) as Entry<T> | undefined;

  useEffect(() => {
    if (!key) return;
    fetchers.set(key, fetcher);
    if (!entries.get(key) || entries.get(key)!.stale) load(key);
    // The fetcher is derived from the key, so the key alone decides when to refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, entry?.stale]);

  return {
    data: entry?.data,
    error: entry?.error,
    loading: key !== null && entry?.data === undefined && !entry?.error,
  };
}

/** Mark every key starting with one of `prefixes` as stale; mounted queries refetch. */
export function invalidate(...prefixes: string[]) {
  for (const key of entries.keys()) {
    if (prefixes.some((p) => key.startsWith(p))) {
      const entry = entries.get(key)!;
      entries.set(key, { ...entry, stale: true });
    }
  }
  emit();
}

/** Put a known value in the cache, e.g. the session returned by a login. */
export function prime<T>(key: string, data: T) {
  setEntry(key, { data, error: undefined, loading: false, stale: false });
}

/** Forget everything, e.g. on sign-out, so the next user never sees the last one's data. */
export function clearCache() {
  entries.clear();
  inflight.clear();
  emit();
}
