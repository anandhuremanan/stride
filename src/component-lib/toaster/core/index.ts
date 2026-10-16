// Framework-free: the store, the timers and the `toast()` API run without
// React, so they can be called from a data layer and tested on their own.
export { createToastApi } from "./api";
export type { PromiseMessages, ToastApi } from "./api";
export {
  createToastStore,
  DEFAULT_DURATION,
  DEFAULT_LIMIT,
  EXIT_DURATION,
  visibleToasts,
} from "./store";
export type { ToastPatch, ToastStore, ToastStoreConfig } from "./store";
export { toast, toastStore } from "./toast";
export type * from "./types";
