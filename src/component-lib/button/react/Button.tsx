"use client";

import {
  useMemo,
  useState,
  type ButtonHTMLAttributes,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
  type Ref,
} from "react";
import { useFormStatus } from "react-dom";
import { buttonState, isPromiseLike } from "../core/state";
import type { ButtonLocaleText, ButtonSize, ButtonVariant } from "../core/types";
import { defaultButtonText } from "./locale";
import { cx, type ButtonRenderProps, type ButtonSlot } from "./props";

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> {
  /** Default `primary`. */
  variant?: ButtonVariant;
  /** Default `md`. */
  size?: ButtonSize;
  /** Show a spinner and ignore clicks, while keeping focus and the button's width. */
  loading?: boolean;
  /** Text shown next to the spinner while busy, instead of keeping the label. */
  loadingText?: ReactNode;
  /** Icon before the label. */
  leading?: ReactNode;
  /** Icon after the label. */
  trailing?: ReactNode;
  /** An icon-only button. Give it an `aria-label`. */
  icon?: ReactNode;
  /** Fill the width of the container, for forms and narrow screens. */
  fullWidth?: boolean;
  /** Return a promise to show the loading state until it settles. */
  onClick?(event: MouseEvent<HTMLElement>): unknown;
  /**
   * Render another element with the button's look and behavior, e.g. a router
   * link: `render={(props) => <Link href="/billing" {...props} />}`.
   */
  render?(props: ButtonRenderProps): ReactElement;
  classNames?: Partial<Record<ButtonSlot, string>>;
  localeText?: Partial<ButtonLocaleText>;
  ref?: Ref<HTMLButtonElement>;
}

/** Attributes that only mean something on a `<button>`, left off a `render`ed element. */
const BUTTON_ONLY = new Set(["form", "formAction", "formEncType", "formMethod", "formNoValidate", "formTarget", "name", "value", "type"]);

const Spinner = () => (
  <svg className="bt-spinner-ring" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <circle cx="12" cy="12" r="9" pathLength={100} />
  </svg>
);

/**
 * A button with variants, sizes, icons and a loading state. An async `onClick`
 * shows progress by itself, and a submit button shows progress while its form's
 * Server Action runs.
 */
export function Button(props: ButtonProps) {
  const {
    ref,
    variant = "primary",
    size = "md",
    type = "button",
    loading = false,
    loadingText,
    leading,
    trailing,
    icon,
    fullWidth = false,
    disabled = false,
    onClick,
    render,
    className,
    classNames,
    localeText,
    children,
    ...rest
  } = props;

  const text = useMemo(() => ({ ...defaultButtonText, ...localeText }), [localeText]);
  // Pending while the surrounding <form action={…}> is submitting (React 19).
  const { pending: formPending } = useFormStatus();
  const [clickPending, setClickPending] = useState(false);
  const state = buttonState({
    disabled,
    loading,
    pending: clickPending || (type === "submit" && formPending),
  });
  const iconOnly = icon !== undefined && (children === undefined || children === null);

  const handleClick = (event: MouseEvent<HTMLElement>) => {
    // aria-disabled doesn't stop a click or a form submit on its own.
    if (state.inactive) {
      event.preventDefault();
      return;
    }
    const result = onClick?.(event);
    if (!isPromiseLike(result)) return;
    setClickPending(true);
    const done = () => setClickPending(false);
    Promise.resolve(result).then(done, (error: unknown) => {
      done();
      // Keep the failure visible instead of swallowing it.
      throw error;
    });
  };

  const content = (
    <>
      <span
        className={cx("bt-content", classNames?.content)}
        // Hidden, not removed, so the button keeps its width while busy.
        data-hidden={state.busy ? "" : undefined}
      >
        {leading && (
          <span className={cx("bt-icon", classNames?.icon)} aria-hidden="true">
            {leading}
          </span>
        )}
        {iconOnly ? <span className={cx("bt-icon", classNames?.icon)}>{icon}</span> : children}
        {trailing && (
          <span className={cx("bt-icon", classNames?.icon)} aria-hidden="true">
            {trailing}
          </span>
        )}
      </span>
      {state.busy && (
        <span className={cx("bt-spinner", classNames?.spinner)}>
          <Spinner />
          {loadingText ?? <span className="bt-sr-only">{text.loading}</span>}
        </span>
      )}
    </>
  );

  const shared = {
    className: cx("bt-root", classNames?.root, className),
    "data-variant": variant,
    "data-size": size,
    "data-busy": state.busy ? ("" as const) : undefined,
    "data-icon-only": iconOnly ? ("" as const) : undefined,
    "data-full-width": fullWidth ? ("" as const) : undefined,
    "data-loading-text": state.busy && loadingText ? "" : undefined,
    "aria-busy": state.busy || undefined,
  };

  if (render) {
    const attributes = Object.fromEntries(Object.entries(rest).filter(([key]) => !BUTTON_ONLY.has(key)));
    return render({
      ...attributes,
      ...shared,
      "aria-disabled": state.inactive || undefined,
      onClick: handleClick,
      children: content,
    });
  }

  return (
    <button
      {...rest}
      {...shared}
      ref={ref}
      type={type}
      disabled={state.nativeDisabled}
      aria-disabled={state.inactive && !state.nativeDisabled ? true : undefined}
      onClick={handleClick}
    >
      {content}
    </button>
  );
}
