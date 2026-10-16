"use client";

import { useCallback, useLayoutEffect, useRef, useState, useSyncExternalStore, type RefObject } from "react";
import type { ReadableStore } from "../core/store";
import type { RowId } from "../core/types";
import { useGridContext } from "./context";

/**
 * Subscribes to a slice of an external store. The component re-renders only
 * when the selected value changes according to `isEqual`.
 *
 * The cache lives in a ref rather than in the getter's closure, because callers
 * pass the selector inline: a closure-held cache would start empty on every
 * render, so `isEqual` would never see the previous value and a selector that
 * builds an object would hand back a fresh identity each time, re-rendering
 * every memoized child below it. The selector is part of the cache key, so a
 * selector that closed over something new is always recomputed.
 */
export function useStoreSelector<S, R>(
  store: ReadableStore<S>,
  selector: (snapshot: S) => R,
  isEqual: (a: R, b: R) => boolean = Object.is,
): R {
  const cache = useRef<{ snapshot: S; selector: (snapshot: S) => R; value: R } | null>(null);

  const getSelection = useCallback(() => {
    const snapshot = store.getSnapshot();
    const previous = cache.current;
    if (previous && Object.is(previous.snapshot, snapshot) && previous.selector === selector) {
      return previous.value;
    }
    const value = selector(snapshot);
    // Keep the previous identity while the two are equal, so `visibleRangeEqual`
    // and friends hold across renders and not just within one.
    const kept = previous && isEqual(previous.value, value) ? previous.value : value;
    cache.current = { snapshot, selector, value: kept };
    return kept;
  }, [store, selector, isEqual]);

  return useSyncExternalStore(store.subscribe, getSelection, getSelection);
}

/** Row selection, from the controlled prop when present, otherwise internal state. */
export function useSelectionState<T, R>(
  selector: (selection: Record<RowId, boolean>) => R,
): R {
  const { engine, controlledSelection } = useGridContext<T>();
  const internal = useStoreSelector(engine.store, (s) => selector(s.state.rowSelection));
  return controlledSelection ? selector(controlledSelection) : internal;
}

/** Moves DOM focus to a cell once it becomes active through keyboard navigation. */
export function useFocusWhenActive(
  ref: RefObject<HTMLElement | null>,
  active: boolean,
  editing = false,
) {
  const { engine } = useGridContext();
  useLayoutEffect(() => {
    if (active && !editing && engine.consumeFocusRequest()) {
      ref.current?.focus({ preventScroll: true });
    }
  }, [active, editing, engine, ref]);
}

/** Open state for an anchored popover, ignoring the click that just dismissed it. */
export function usePopoverState<P = void>() {
  const [state, setState] = useState<{ anchor: HTMLElement; payload: P } | null>(null);
  const lastClosed = useRef<{ anchor: HTMLElement | null; time: number }>({ anchor: null, time: 0 });

  const open = useCallback((anchor: HTMLElement, payload: P) => {
    const last = lastClosed.current;
    if (last.anchor === anchor && performance.now() - last.time < 300) return;
    setState({ anchor, payload });
  }, []);

  const close = useCallback((anchor: HTMLElement | null) => {
    lastClosed.current = { anchor, time: performance.now() };
    setState(null);
  }, []);

  return { state, open, close };
}
