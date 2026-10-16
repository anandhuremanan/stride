"use client";

import { useEffect, useRef, useState } from "react";
import { stepVisibility } from "../core/visibility";
import type { VisibilityMarks, VisibilityOptions } from "../core/types";

/**
 * `loading`, smoothed for display: true only after `delay` has passed, and then
 * for at least `minDuration`. Use it for any loading UI, not just the Spinner.
 */
export function useDelayedLoading(loading: boolean, options: VisibilityOptions = {}): boolean {
  const { delay = 0, minDuration = 0 } = options;
  const immediate = delay <= 0 && minDuration <= 0;
  const [visible, setVisible] = useState(() => loading && delay <= 0);
  const marks = useRef<VisibilityMarks>({ visible: loading && delay <= 0, loadingSince: null, visibleSince: null });

  useEffect(() => {
    if (immediate) return;
    const current = marks.current;
    const now = Date.now();
    current.loadingSince = loading ? (current.loadingSince ?? now) : null;
    if (current.visible) current.visibleSince ??= now;

    let timer: ReturnType<typeof setTimeout> | undefined;
    const evaluate = () => {
      const step = stepVisibility(loading, current, Date.now(), { delay, minDuration });
      if (step.visible !== current.visible) {
        current.visible = step.visible;
        current.visibleSince = step.visible ? Date.now() : null;
        setVisible(step.visible);
      }
      if (step.recheckIn !== null) timer = setTimeout(evaluate, step.recheckIn);
    };
    timer = setTimeout(evaluate, 0);
    return () => clearTimeout(timer);
  }, [loading, delay, minDuration, immediate]);

  return immediate ? loading : visible;
}
