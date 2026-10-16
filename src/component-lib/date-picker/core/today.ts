import { addDays, startOfDay } from "./calendar";

/**
 * The current local day, as one value every picker on the page shares.
 *
 * It exists as a store rather than a `new Date()` in each component for two
 * reasons. A date read once at mount goes stale: a page left open overnight
 * keeps marking yesterday. And a date read during a server render is a value
 * the browser cannot reproduce — it may be on the other side of midnight, or in
 * another time zone — so rendering it would hand hydration a mismatch.
 *
 * `getServerToday` answers `null`, which React also uses for the client's
 * hydrating render. The markup therefore agrees with the server exactly, no
 * marker either side, and the real day arrives in the re-render straight after
 * hydration. A page with no server render never sees the null: React reads
 * `getToday` on the first pass, so the marker is there from the first paint.
 *
 * One timer serves every subscriber, set for the next local midnight and
 * computed with `addDays` so it survives a daylight-saving change. A machine
 * that slept through midnight fires it late, and the tick then reads the clock
 * rather than trusting the schedule.
 */

let current: Date | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();

const readClock = () => startOfDay(new Date());

function schedule(): void {
  clearTimeout(timer);
  timer = undefined;
  if (listeners.size === 0 || current === null) return;
  // A deadline already passed (a long sleep) collapses to zero and catches up.
  timer = setTimeout(tick, Math.max(0, addDays(current, 1).getTime() - Date.now()));
}

function tick(): void {
  const next = readClock();
  if (current === null || next.getTime() !== current.getTime()) {
    current = next;
    for (const listener of listeners) listener();
  }
  schedule();
}

export function subscribeToToday(listener: () => void): () => void {
  listeners.add(listener);
  if (listeners.size === 1) {
    // Nothing was watching the clock, so whatever is cached may be a day old.
    current = readClock();
    schedule();
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      clearTimeout(timer);
      timer = undefined;
    }
  };
}

/** Today, as a cached value: the same object until the day actually changes. */
export function getToday(): Date {
  current ??= readClock();
  return current;
}

/** Null on the server and through hydration; see the note above. */
export function getServerToday(): null {
  return null;
}
