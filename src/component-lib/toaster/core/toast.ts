import { createToastApi } from "./api";
import { createToastStore } from "./store";

/** The store behind `toast()`, and behind any `<Toaster />` without a `store` prop. */
export const toastStore = createToastStore();

/**
 * Shows a notification from anywhere: components, event handlers, data layers,
 * code outside React. On a server nobody can see a toast, so calls do nothing
 * there — which also keeps one request's toasts from leaking into another's.
 */
export const toast = createToastApi(toastStore, () => typeof document !== "undefined");
