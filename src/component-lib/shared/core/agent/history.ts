/*
 * Undo by snapshot, not by inverse.
 *
 * Writing an inverse for every operation means writing it again for every
 * operation added later, and getting it wrong once is a corrupted document.
 * When the state is small and serialisable — which is the precondition for a
 * component to be agent-operable at all — storing it whole is both cheaper to
 * maintain and exactly correct.
 *
 * The history never reads or writes state itself; it is handed `read` and
 * `write` and knows nothing about what is in there.
 */

export interface SnapshotEntry<S> {
  /** Human-readable, for an audit trail: "Filter Revenue greater than 100000". */
  label: string;
  before: S;
  after: S;
  at: number;
}

export interface SnapshotHistoryOptions<S> {
  read(): S;
  write(snapshot: S): void;
  /** Entries kept. Older ones fall off the back. Default 50. */
  limit?: number;
  /** Injected in tests so entries are comparable. Defaults to `Date.now`. */
  now?(): number;
}

export interface SnapshotHistory<S> {
  /**
   * Snapshots, runs `apply`, snapshots again, and records the pair. A run that
   * leaves the state untouched records nothing, so a no-op never costs an undo.
   *
   * An `apply` that returns a promise is awaited before the second snapshot is
   * taken, so an operation that finishes asynchronously is still recorded with
   * the state it actually produced.
   */
  record<R>(label: string, apply: () => R): R;
  undo(): boolean;
  redo(): boolean;
  canUndo(): boolean;
  canRedo(): boolean;
  /** Oldest first. The entry at `index() - 1` is the one `undo` would reverse. */
  entries(): readonly SnapshotEntry<S>[];
  index(): number;
  clear(): void;
  subscribe(listener: () => void): () => void;
}

export function createSnapshotHistory<S>(options: SnapshotHistoryOptions<S>): SnapshotHistory<S> {
  const { read, write, limit = 50, now = Date.now } = options;
  let entries: SnapshotEntry<S>[] = [];
  let index = 0;
  const listeners = new Set<() => void>();

  const notify = () => {
    for (const listener of listeners) listener();
  };

  return {
    record(label, apply) {
      const before = read();

      const commit = () => {
        const after = read();
        if (Object.is(before, after)) return;
        // A new branch discards whatever redo was holding.
        entries = [...entries.slice(0, index), { label, before, after, at: now() }];
        if (entries.length > limit) entries = entries.slice(entries.length - limit);
        index = entries.length;
        notify();
      };

      const result = apply();
      if (result instanceof Promise) {
        return result.then((value) => {
          commit();
          return value;
        }) as typeof result;
      }
      commit();
      return result;
    },

    undo() {
      if (index === 0) return false;
      index -= 1;
      write(entries[index].before);
      notify();
      return true;
    },

    redo() {
      if (index >= entries.length) return false;
      write(entries[index].after);
      index += 1;
      notify();
      return true;
    },

    canUndo: () => index > 0,
    canRedo: () => index < entries.length,
    entries: () => entries,
    index: () => index,

    clear() {
      if (entries.length === 0) return;
      entries = [];
      index = 0;
      notify();
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
