export interface ReadableStore<S> {
  getSnapshot(): S;
  subscribe(listener: () => void): () => void;
}

export interface Store<S> extends ReadableStore<S> {
  setState(updater: (prev: S) => S): void;
  notify(): void;
}

/** Minimal external store for `useSyncExternalStore`. */
export function createStore<S>(initial: S): Store<S> {
  let state = initial;
  const listeners = new Set<() => void>();

  const notify = () => {
    for (const listener of listeners) listener();
  };

  return {
    getSnapshot: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    setState(updater) {
      const next = updater(state);
      if (Object.is(next, state)) return;
      state = next;
      notify();
    },
    notify,
  };
}

export function shallowEqual<T>(a: T, b: T): boolean {
  if (Object.is(a, b)) return true;
  if (
    typeof a !== "object" ||
    typeof b !== "object" ||
    a === null ||
    b === null
  ) {
    return false;
  }
  const keysA = Object.keys(a) as (keyof T)[];
  if (keysA.length !== Object.keys(b).length) return false;
  for (const key of keysA) {
    if (!Object.is(a[key], b[key])) return false;
  }
  return true;
}
