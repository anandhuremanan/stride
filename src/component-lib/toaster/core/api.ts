import type { ReactNode } from "react";
import type { ToastPatch, ToastStore } from "./store";
import type { ToastOptions, ToastRenderProps, ToastType } from "./types";

type TypedOptions = Omit<ToastOptions, "type">;
type Message<T> = ReactNode | ((value: T) => ReactNode);

export interface PromiseMessages<T> {
  loading: ReactNode;
  /** Omit to close the toast quietly on success. */
  success?: Message<T>;
  /** Omit to close the toast quietly on failure. */
  error?: Message<unknown>;
}

export interface ToastApi {
  (title: ReactNode, options?: ToastOptions): string;
  success(title: ReactNode, options?: TypedOptions): string;
  error(title: ReactNode, options?: TypedOptions): string;
  warning(title: ReactNode, options?: TypedOptions): string;
  info(title: ReactNode, options?: TypedOptions): string;
  /** Stays until updated or dismissed. */
  loading(title: ReactNode, options?: TypedOptions): string;
  custom(
    render: (props: ToastRenderProps) => ReactNode,
    options?: Omit<TypedOptions, "render">,
  ): string;
  /** Shows a loading toast, then turns it into a success or error. Returns the same promise. */
  promise<T>(
    input: Promise<T> | (() => Promise<T>),
    messages: PromiseMessages<T>,
    options?: TypedOptions,
  ): Promise<T>;
  update(id: string, patch: ToastPatch): void;
  dismiss(id?: string): void;
}

/**
 * The `toast()` function for a store. `canShow` lets the default instance ignore
 * calls made where nobody can see them, such as during a server render.
 */
export function createToastApi(store: ToastStore, canShow: () => boolean = () => true): ToastApi {
  const show = (title: ReactNode, options?: ToastOptions) =>
    canShow() ? store.show(title, options) : (options?.id ?? "");

  const typed = (type: ToastType) => (title: ReactNode, options?: TypedOptions) =>
    show(title, { ...options, type });

  function promise<T>(
    input: Promise<T> | (() => Promise<T>),
    messages: PromiseMessages<T>,
    options?: TypedOptions,
  ): Promise<T> {
    const pending = typeof input === "function" ? input() : input;
    if (!canShow()) return pending;

    const id = store.show(messages.loading, { ...options, type: "loading" });

    function settle<V>(type: "success" | "error", message: Message<V> | undefined, value: V) {
      if (message === undefined) store.dismiss(id);
      else store.update(id, { type, title: typeof message === "function" ? message(value) : message });
    }

    // Handling the rejection here also stops it being reported as unhandled when
    // the caller doesn't await the returned promise.
    pending.then(
      (value) => settle("success", messages.success, value),
      (error: unknown) => settle("error", messages.error, error),
    );
    return pending;
  }

  return Object.assign(show, {
    success: typed("success"),
    error: typed("error"),
    warning: typed("warning"),
    info: typed("info"),
    loading: typed("loading"),
    custom: (
      render: (props: ToastRenderProps) => ReactNode,
      options?: Omit<TypedOptions, "render">,
    ) => show(null, { ...options, render }),
    promise,
    update: (id: string, patch: ToastPatch) => store.update(id, patch),
    dismiss: (id?: string) => store.dismiss(id),
  });
}
