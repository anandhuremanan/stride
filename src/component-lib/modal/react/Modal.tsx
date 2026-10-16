"use client";

import {
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
  type Ref,
  type RefObject,
} from "react";
import { useControllableState } from "../../shared/react/useControllableState";
import { canDismiss, confirmClose, isOutside } from "../core/dismiss";
import type {
  CloseReason,
  ModalLocaleText,
  ModalPlacement,
  ModalSize,
} from "../core/types";
import { XIcon } from "./icons";
import { defaultModalText } from "./locale";
import { cx, type ModalHandle, type ModalRenderProps, type ModalSlot } from "./props";

/** Matches the CSS transition, so content stays mounted while the modal animates out. */
const EXIT_DURATION = 200;

type Renderable = ReactNode | ((props: ModalRenderProps) => ReactNode);

export interface ModalProps {
  /** Controlled open state. */
  open?: boolean;
  /** Open to begin with, when you are not controlling `open`. */
  defaultOpen?: boolean;
  /** `reason` says what closed it; it is undefined when opening. */
  onOpenChange?(open: boolean, reason?: CloseReason): void;
  title?: ReactNode;
  /** A line under the title, linked as the dialog's description. */
  description?: ReactNode;
  /** Accessible name when there is no `title`. */
  "aria-label"?: string;
  children?: Renderable;
  /**
   * The actions row, pinned below the scrolling content so it stays
   * reachable however long the body is.
   */
  footer?: Renderable;
  /** Width for dialogs; for drawers, the width (left/right) or height (bottom). Default `md`. */
  size?: ModalSize;
  /** Default `center`. */
  placement?: ModalPlacement;
  /** Show the × button. Default true. */
  closeButton?: boolean;
  /** Default true. */
  closeOnEscape?: boolean;
  /** Default true. */
  closeOnBackdrop?: boolean;
  /** Return `false` (or a promise of it) to keep the modal open, e.g. for unsaved changes. */
  onBeforeClose?(reason: CloseReason): boolean | Promise<boolean>;
  /** Focused on open. Otherwise the first `[data-autofocus]` element, then the first focusable one. */
  initialFocus?: RefObject<HTMLElement | null>;
  /** Keep the content mounted while closed, preserving its state. Default false. */
  keepMounted?: boolean;
  id?: string;
  className?: string;
  classNames?: Partial<Record<ModalSlot, string>>;
  style?: CSSProperties;
  localeText?: Partial<ModalLocaleText>;
  ref?: Ref<ModalHandle>;
}

const outside = (event: MouseEvent<HTMLDialogElement>) =>
  event.target === event.currentTarget &&
  isOutside(event.currentTarget.getBoundingClientRect(), event.clientX, event.clientY);

/**
 * A modal built on the native `<dialog>` element. The browser provides the top
 * layer, the inert background, the focus trap and focus return; the component
 * adds controlled state, dismiss rules, drawers and animation.
 */
export function Modal(props: ModalProps) {
  const {
    ref,
    open: openProp,
    defaultOpen = false,
    onOpenChange,
    title,
    description,
    "aria-label": ariaLabel,
    children,
    footer,
    size = "md",
    placement = "center",
    closeButton = true,
    closeOnEscape = true,
    closeOnBackdrop = true,
    onBeforeClose,
    initialFocus,
    keepMounted = false,
    id: idProp,
    className,
    classNames,
    style,
    localeText,
  } = props;

  const reactId = useId();
  const id = idProp ?? reactId;
  const text = useMemo(() => ({ ...defaultModalText, ...localeText }), [localeText]);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const pressStartedOutside = useRef(false);

  const [open, setOpenState] = useControllableState(openProp, defaultOpen);

  // Keep the content mounted through the exit transition. Adjusting state while
  // rendering avoids an extra render with the content already gone.
  const [previousOpen, setPreviousOpen] = useState(open);
  const [closing, setClosing] = useState(false);
  if (previousOpen !== open) {
    setPreviousOpen(open);
    setClosing(!open);
  }

  useEffect(() => {
    if (!closing) return;
    const timer = setTimeout(() => setClosing(false), EXIT_DURATION);
    return () => clearTimeout(timer);
  }, [closing]);

  const setOpen = useCallback(
    (next: boolean, reason?: CloseReason) => {
      setOpenState(next);
      onOpenChange?.(next, reason);
    },
    [setOpenState, onOpenChange],
  );

  const requestClose = useCallback(
    (reason: CloseReason) => {
      if (!canDismiss(reason, { closeOnEscape, closeOnBackdrop })) return;
      void confirmClose(onBeforeClose, reason).then((allowed) => {
        if (allowed) setOpen(false, reason);
      });
    },
    [closeOnEscape, closeOnBackdrop, onBeforeClose, setOpen],
  );

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      const target =
        initialFocus?.current ?? dialog.querySelector<HTMLElement>("[data-autofocus]");
      target?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open, initialFocus]);

  useImperativeHandle(
    ref,
    () => ({
      open: () => setOpen(true),
      close: () => requestClose("api"),
      getElement: () => dialogRef.current,
    }),
    [setOpen, requestClose],
  );

  const renderProps: ModalRenderProps = { close: () => requestClose("api") };
  const render = (node: Renderable) => (typeof node === "function" ? node(renderProps) : node);
  const mounted = open || closing || keepMounted;

  return (
    <dialog
      ref={dialogRef}
      id={id}
      className={cx("md-root", classNames?.root, className)}
      style={style}
      data-size={size}
      data-placement={placement}
      data-state={open ? "open" : "closed"}
      aria-labelledby={title ? `${id}-title` : undefined}
      aria-describedby={description ? `${id}-description` : undefined}
      aria-label={title ? undefined : ariaLabel}
      // Escape: keep the browser from closing it, and decide ourselves.
      onCancel={(event) => {
        event.preventDefault();
        requestClose("escape");
      }}
      // Closed some other way, e.g. by a `<form method="dialog">` inside.
      onClose={() => {
        if (open) setOpen(false, "api");
      }}
      // A drag that starts inside and ends on the backdrop must not close it.
      onPointerDown={(event) => {
        pressStartedOutside.current = outside(event);
      }}
      onClick={(event) => {
        if (pressStartedOutside.current && outside(event)) requestClose("backdrop");
        pressStartedOutside.current = false;
      }}
    >
      {mounted && (
        <>
          {(title || description || closeButton) && (
            <header className={cx("md-header", classNames?.header)}>
              <div className="md-heading">
                {title && (
                  <h2 id={`${id}-title`} className={cx("md-title", classNames?.title)}>
                    {title}
                  </h2>
                )}
                {description && (
                  <p id={`${id}-description`} className={cx("md-description", classNames?.description)}>
                    {description}
                  </p>
                )}
              </div>
              {closeButton && (
                <button
                  type="button"
                  className={cx("md-close", classNames?.close)}
                  aria-label={text.close}
                  title={text.close}
                  onClick={() => requestClose("close-button")}
                >
                  <XIcon />
                </button>
              )}
            </header>
          )}
          {/* Focusable: the body scrolls, and a scroll area the keyboard can't
              reach leaves its content unreadable without a mouse. */}
          <div className={cx("md-body", classNames?.body)} tabIndex={0}>
            {render(children)}
          </div>
          {footer && <footer className={cx("md-footer", classNames?.footer)}>{render(footer)}</footer>}
        </>
      )}
    </dialog>
  );
}
