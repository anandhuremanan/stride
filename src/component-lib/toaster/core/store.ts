import type { ReactNode } from "react";
import type { ToastOptions, ToastRecord, ToastSnapshot } from "./types";

export const DEFAULT_DURATION = 5000;
export const DEFAULT_LIMIT = 3;
/** Matches the CSS exit transition, so a toast fades out before it leaves the DOM. */
export const EXIT_DURATION = 200;

export interface ToastStoreConfig {
  /** Default auto-close delay in milliseconds. */
  duration?: number;
  /** Open toasts on screen at once; the rest wait with their timers held. */
  limit?: number;
  /** How long a closed toast stays for its exit animation. */
  exitDuration?: number;
}

export type ToastPatch = Omit<ToastOptions, "id"> & { title?: ReactNode };

export interface ToastStore {
  subscribe(listener: () => void): () => void;
  getSnapshot(): ToastSnapshot;
  getServerSnapshot(): ToastSnapshot;
  /** Adds a toast, or updates the one with the same `id`. Returns the id. */
  show(title: ReactNode, options?: ToastOptions): string;
  /** Changes an open toast. A new `type` without a `duration` gets that type's default. */
  update(id: string, patch: ToastPatch): void;
  /** Closes one toast, or every toast when no id is given. */
  dismiss(id?: string): void;
  pause(): void;
  resume(): void;
  configure(config: ToastStoreConfig): void;
}

interface Countdown {
  remaining: number;
  startedAt: number;
  handle: ReturnType<typeof setTimeout> | null;
}

const EMPTY: ToastSnapshot = { toasts: [], paused: false, limit: DEFAULT_LIMIT };

/** What a Toaster renders: every closing toast, plus the newest `limit` open ones. */
export function visibleToasts(snapshot: ToastSnapshot): ToastRecord[] {
  let open = 0;
  return snapshot.toasts.filter((toast) => toast.state !== "open" || open++ < snapshot.limit);
}

function definedOnly<T extends object>(value: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  ) as Partial<T>;
}

/**
 * Toast state and timers, with no React. Snapshots are immutable, so the store
 * plugs straight into `useSyncExternalStore`. Only toasts on screen count down:
 * one waiting beyond `limit` keeps its full time until it gets a slot.
 */
export function createToastStore(config: ToastStoreConfig = {}): ToastStore {
  let settings: Required<ToastStoreConfig> = {
    duration: DEFAULT_DURATION,
    limit: DEFAULT_LIMIT,
    exitDuration: EXIT_DURATION,
    ...definedOnly(config),
  };
  let snapshot: ToastSnapshot = { ...EMPTY, limit: settings.limit };
  let counter = 0;
  const listeners = new Set<() => void>();
  const countdowns = new Map<string, Countdown>();
  const removals = new Map<string, ReturnType<typeof setTimeout>>();

  function stop(id: string) {
    const countdown = countdowns.get(id);
    if (!countdown?.handle) return;
    clearTimeout(countdown.handle);
    countdown.handle = null;
    countdown.remaining = Math.max(0, countdown.remaining - (Date.now() - countdown.startedAt));
  }

  function syncTimers() {
    const visible = new Set(visibleToasts(snapshot));
    for (const toast of snapshot.toasts) {
      const countdown = countdowns.get(toast.id);
      if (!countdown || toast.state !== "open") continue;
      const run =
        visible.has(toast) && !snapshot.paused && Number.isFinite(countdown.remaining);
      if (run && !countdown.handle) {
        countdown.startedAt = Date.now();
        countdown.handle = setTimeout(() => close(toast.id, true), countdown.remaining);
      } else if (!run && countdown.handle) {
        stop(toast.id);
      }
    }
  }

  function commit(
    toasts: readonly ToastRecord[],
    changes: Partial<Omit<ToastSnapshot, "toasts">> = {},
  ) {
    snapshot = { ...snapshot, ...changes, toasts };
    syncTimers();
    for (const listener of listeners) listener();
  }

  function close(id: string, auto: boolean) {
    const toast = snapshot.toasts.find((item) => item.id === id && item.state === "open");
    if (!toast) return;
    stop(id);
    countdowns.delete(id);

    const closing: ToastRecord = { ...toast, state: "closing" };
    commit(snapshot.toasts.map((item) => (item === toast ? closing : item)));
    if (auto) closing.onAutoClose?.(closing);
    else closing.onDismiss?.(closing);

    removals.set(
      id,
      setTimeout(() => {
        removals.delete(id);
        commit(snapshot.toasts.filter((item) => item !== closing));
      }, settings.exitDuration),
    );
  }

  function show(title: ReactNode, options: ToastOptions = {}): string {
    const id = options.id ?? `toast-${++counter}`;
    const type = options.type ?? "default";
    const existing = snapshot.toasts.find((item) => item.id === id);
    const reused = existing?.state === "open" ? existing : undefined;
    const requested = options.duration ?? (type === "loading" ? Infinity : settings.duration);

    const record: ToastRecord = {
      ...options,
      id,
      type,
      title,
      // 0, negative and NaN all mean "stay until dismissed".
      duration: requested > 0 ? requested : Infinity,
      dismissible: options.dismissible ?? true,
      state: "open",
      createdAt: reused?.createdAt ?? Date.now(),
      version: (existing?.version ?? 0) + 1,
    };

    // Showing an id that is fading out brings it back instead of stacking a copy.
    const removal = removals.get(id);
    if (removal !== undefined) {
      clearTimeout(removal);
      removals.delete(id);
    }
    stop(id);
    countdowns.set(id, { remaining: record.duration, startedAt: 0, handle: null });

    commit(
      reused
        ? snapshot.toasts.map((item) => (item === reused ? record : item))
        : [record, ...snapshot.toasts.filter((item) => item.id !== id)],
    );
    return id;
  }

  function update(id: string, patch: ToastPatch) {
    const existing = snapshot.toasts.find((item) => item.id === id && item.state === "open");
    if (!existing) return;
    const { title = existing.title, ...changes } = patch;
    const typeChanged = changes.type !== undefined && changes.type !== existing.type;
    show(title, {
      ...existing,
      ...changes,
      id,
      duration: changes.duration ?? (typeChanged ? undefined : existing.duration),
    });
  }

  function dismiss(id?: string) {
    if (id !== undefined) {
      close(id, false);
      return;
    }
    for (const toast of snapshot.toasts) {
      if (toast.state === "open") close(toast.id, false);
    }
  }

  function setPaused(paused: boolean) {
    if (snapshot.paused !== paused) commit(snapshot.toasts, { paused });
  }

  function configure(next: ToastStoreConfig) {
    settings = { ...settings, ...definedOnly(next) };
    if (settings.limit !== snapshot.limit) commit(snapshot.toasts, { limit: settings.limit });
  }

  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot: () => snapshot,
    getServerSnapshot: () => EMPTY,
    show,
    update,
    dismiss,
    pause: () => setPaused(true),
    resume: () => setPaused(false),
    configure,
  };
}
