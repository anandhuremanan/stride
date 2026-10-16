"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { visibleToasts, type ToastStore } from "../core/store";
import { toastStore } from "../core/toast";
import type { ToasterLocaleText, ToastPosition, ToastType } from "../core/types";
import { defaultToasterText } from "./locale";
import { cx, type ToasterSlot } from "./props";
import { ToastItem } from "./ToastItem";
import { useToasts } from "./useToasts";

export interface ToasterProps {
  /** Default `"top-right"`. */
  position?: ToastPosition;
  /** Open toasts on screen at once; the rest wait their turn. Default 3. */
  limit?: number;
  /** Default auto-close delay in milliseconds. Default 5000. */
  duration?: number;
  /** Show a close button on dismissible toasts. Default true. */
  closeButton?: boolean;
  /**
   * Keys that move focus to the notifications: `KeyboardEvent` modifier names
   * plus a `code`. Default `["altKey", "KeyT"]`.
   */
  hotkey?: readonly string[];
  /** Replace the icon per type; `null` hides it. */
  icons?: Partial<Record<ToastType, ReactNode>>;
  /** A store from `createToastStore()`. Defaults to the one behind `toast()`. */
  store?: ToastStore;
  /**
   * Writing direction, which decides which corner `position` means.
   * Default `auto`, taken from the document.
   */
  dir?: "ltr" | "rtl" | "auto";
  className?: string;
  classNames?: Partial<Record<ToasterSlot, string>>;
  style?: CSSProperties;
  localeText?: Partial<ToasterLocaleText>;
}

type Modifier = "altKey" | "ctrlKey" | "metaKey" | "shiftKey";

const MODIFIER_LABELS: Record<Modifier, string> = {
  altKey: "Alt",
  ctrlKey: "Ctrl",
  metaKey: "Meta",
  shiftKey: "Shift",
};

const DEFAULT_HOTKEY: readonly string[] = ["altKey", "KeyT"];

const isModifier = (key: string): key is Modifier => Object.hasOwn(MODIFIER_LABELS, key);

const hotkeyLabel = (keys: readonly string[]) =>
  keys
    .map((key) => (isModifier(key) ? MODIFIER_LABELS[key] : key.replace(/^(Key|Digit)/, "")))
    .join("+");

const subscribeNothing = () => () => {};

/**
 * Mount once, anywhere in the app. Toasts come from `toast()` and render in a
 * portal on `<body>`, so no parent's overflow, transform or z-index can hide them.
 */
export function Toaster(props: ToasterProps) {
  const {
    position = "top-right",
    limit,
    duration,
    closeButton = true,
    hotkey = DEFAULT_HOTKEY,
    icons,
    store = toastStore,
    dir,
    className,
    classNames,
    style,
    localeText,
  } = props;

  const snapshot = useToasts(store);
  // False during a server render and hydration, so the portal never causes a mismatch.
  const mounted = useSyncExternalStore(
    subscribeNothing,
    () => true,
    () => false,
  );
  const text = useMemo(() => ({ ...defaultToasterText, ...localeText }), [localeText]);

  const listRef = useRef<HTMLOListElement>(null);
  const pointerInside = useRef(false);
  const focusInside = useRef(false);

  useEffect(() => {
    store.configure({ limit, duration });
  }, [store, limit, duration]);

  /** Timers hold while someone is reading: pointer over, focus inside, or tab hidden. */
  const syncPause = useCallback(() => {
    const hold =
      pointerInside.current || focusInside.current || document.visibilityState === "hidden";
    if (hold) store.pause();
    else store.resume();
  }, [store]);

  useEffect(() => {
    document.addEventListener("visibilitychange", syncPause);
    return () => document.removeEventListener("visibilitychange", syncPause);
  }, [syncPause]);

  const empty = snapshot.toasts.length === 0;
  useEffect(() => {
    if (!empty) return;
    // A toast that disappears under the pointer never fires pointerleave.
    pointerInside.current = false;
    focusInside.current = false;
    syncPause();
  }, [empty, syncPause]);

  useEffect(() => {
    if (hotkey.length === 0) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const pressed = hotkey.every((key) => (isModifier(key) ? event[key] : event.code === key));
      if (!pressed) return;
      event.preventDefault();
      listRef.current?.focus();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [hotkey]);

  if (!mounted) return null;

  return createPortal(
    <section
      className={cx("ts-region", classNames?.region, className)}
      style={style}
      dir={dir}
      data-position={position}
      aria-label={text.regionLabel(hotkeyLabel(hotkey))}
      onPointerEnter={() => {
        pointerInside.current = true;
        syncPause();
      }}
      onPointerLeave={() => {
        pointerInside.current = false;
        syncPause();
      }}
      onFocus={() => {
        focusInside.current = true;
        syncPause();
      }}
      onBlur={(event) => {
        if (event.currentTarget.contains(event.relatedTarget)) return;
        focusInside.current = false;
        syncPause();
      }}
    >
      {/* Always mounted, even when empty, so screen readers announce the first toast. */}
      <ol
        ref={listRef}
        tabIndex={-1}
        className={cx("ts-list", classNames?.list)}
        aria-live="polite"
        aria-relevant="additions text"
      >
        {visibleToasts(snapshot).map((item) => (
          <ToastItem
            key={item.id}
            toast={item}
            store={store}
            closeButton={closeButton}
            icons={icons}
            classNames={classNames}
            text={text}
          />
        ))}
      </ol>
    </section>,
    document.body,
  );
}
