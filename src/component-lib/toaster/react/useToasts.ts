"use client";

import { useSyncExternalStore } from "react";
import type { ToastStore } from "../core/store";
import { toastStore } from "../core/toast";
import type { ToastSnapshot } from "../core/types";

/** The live toast list, for building your own notification UI on the same store. */
export function useToasts(store: ToastStore = toastStore): ToastSnapshot {
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
}
