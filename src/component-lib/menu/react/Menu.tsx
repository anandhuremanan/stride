"use client";

import {
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ContextType,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
  type Ref,
} from "react";
import { ChevronRightIcon } from "../../shared/react/icons";
import { AnchoredPopover } from "../../shared/react/Popover";
import { useControllableState } from "../../shared/react/useControllableState";
import type {
  MenuAlign,
  MenuCloseReason,
  MenuLocaleText,
  MenuSide,
  MenuSlot,
} from "../core/types";
import { MenuContext, useMenuContext } from "./context";
import { defaultMenuText } from "./locale";
import { cx } from "./props";
import { useMenuKeys } from "./useMenuKeys";

export interface MenuHandle {
  open(): void;
  close(): void;
  getElement(): HTMLElement | null;
}

export interface MenuProps {
  /**
   * The element that opens the menu. It is cloned with the ARIA wiring, so pass
   * a single element — any button in this library works.
   */
  trigger: ReactElement<{ [attribute: string]: unknown }>;
  children: ReactNode;
  /** Controlled open state. */
  open?: boolean;
  /** Open to begin with, when you are not controlling `open`. */
  defaultOpen?: boolean;
  /**
   * `reason` says what closed it - `escape`, `outside`, `trigger`,
   * `select` or `api` - and is undefined when opening.
   */
  onOpenChange?(open: boolean, reason?: MenuCloseReason): void;
  /** Names the menu for screen readers. Defaults to the locale text. */
  label?: string;
  /** Default `bottom`. */
  side?: MenuSide;
  /** Default `start`. */
  align?: MenuAlign;
  /** Distance from the trigger. Default 4. */
  gap?: number;
  /** Close the menu when an item is chosen. Default true. */
  closeOnSelect?: boolean;
  id?: string;
  className?: string;
  classNames?: Partial<Record<MenuSlot, string>>;
  style?: CSSProperties;
  localeText?: Partial<MenuLocaleText>;
  ref?: Ref<MenuHandle>;
}

/**
 * A menu of commands, following the WAI-ARIA menu button pattern: arrow keys
 * with wrap-around, Home and End, typeahead, Escape to close and focus returned
 * to the trigger.
 *
 * Rendered in the top layer, so it is never clipped by a toolbar or a scrolling
 * panel. For a form or free content in a panel use the Popover instead.
 */
export function Menu(props: MenuProps) {
  const {
    ref,
    trigger,
    children,
    open: openProp,
    defaultOpen = false,
    onOpenChange,
    label,
    side = "bottom",
    align = "start",
    gap = 4,
    closeOnSelect = true,
    id: idProp,
    className,
    classNames,
    style,
    localeText,
  } = props;

  const reactId = useId();
  const id = idProp ?? reactId;
  const text = useMemo(() => ({ ...defaultMenuText, ...localeText }), [localeText]);

  const [open, setOpenState] = useControllableState(openProp, defaultOpen);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  // Where focus lands when it opens: the pattern says the first item, except
  // when ArrowUp opened it, which starts at the bottom.
  const [entry, setEntry] = useState<"first" | "last">("first");
  const panelRef = useRef<HTMLDivElement>(null);

  const setOpen = useCallback(
    (next: boolean, reason?: MenuCloseReason) => {
      setOpenState(next);
      onOpenChange?.(next, reason);
    },
    [setOpenState, onOpenChange],
  );

  useImperativeHandle(
    ref,
    () => ({
      open: () => setOpen(true),
      close: () => setOpen(false, "api"),
      getElement: () => panelRef.current,
    }),
    [setOpen],
  );

  if (!isValidElement(trigger)) {
    throw new Error("Menu: `trigger` must be a single React element.");
  }

  const triggerHandlers = trigger.props as {
    onClick?(event: MouseEvent<HTMLElement>): void;
    onKeyDown?(event: KeyboardEvent<HTMLElement>): void;
  };

  const triggerProps = {
    "aria-haspopup": "menu" as const,
    "aria-expanded": open,
    "aria-controls": open ? `${id}-menu` : undefined,
    onClick(event: MouseEvent<HTMLElement>) {
      triggerHandlers.onClick?.(event);
      if (event.defaultPrevented) return;
      if (open) {
        setOpen(false, "trigger");
        return;
      }
      setEntry("first");
      setAnchor(event.currentTarget);
      setOpen(true);
    },
    onKeyDown(event: KeyboardEvent<HTMLElement>) {
      triggerHandlers.onKeyDown?.(event);
      if (event.defaultPrevented || open) return;
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
      // Opening with an arrow key also says where to start.
      event.preventDefault();
      setEntry(event.key === "ArrowDown" ? "first" : "last");
      setAnchor(event.currentTarget);
      setOpen(true);
    },
  };

  const context = useMemo(
    () => ({
      close: (reason: MenuCloseReason) => setOpen(false, reason),
      closeOnSelect,
      classNames,
      depth: 0,
    }),
    [setOpen, closeOnSelect, classNames],
  );

  return (
    <>
      {cloneElement(trigger, triggerProps)}
      {open && anchor && (
        <AnchoredPopover
          anchor={anchor}
          onClose={() => setOpen(false, "outside")}
          id={`${id}-menu`}
          role="menu"
          label={label ?? text.label}
          side={side}
          align={align}
          gap={gap}
          fitHeight
          minHeight={120}
          autoFocus={false}
          observeResize="self"
          returnFocus
          className={cx("mn-root", classNames?.root, className)}
        >
          <MenuPanel
            ref={panelRef}
            entry={entry}
            nested={false}
            style={style}
            context={context}
            onDismiss={() => setOpen(false, "escape")}
          >
            {children}
          </MenuPanel>
        </AnchoredPopover>
      )}
    </>
  );
}

/* --------------------------------------------------------------- the panel */

interface MenuPanelProps {
  children: ReactNode;
  entry: "first" | "last";
  nested: boolean;
  style?: CSSProperties;
  context: ContextType<typeof MenuContext>;
  onDismiss(): void;
  ref?: Ref<HTMLDivElement>;
}

/**
 * The list itself. Focus is moved here rather than in the popover primitive
 * because this runs as a passive effect — after the primitive's layout effect
 * has called `showPopover()`, without which the items are still `display: none`
 * and cannot take focus.
 */
function MenuPanel({ children, entry, nested, style, context, onDismiss, ref }: MenuPanelProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const { onKeyDown, focusFirst, focusLast } = useMenuKeys({ listRef, onDismiss, nested });

  useEffect(() => {
    if (entry === "last") focusLast();
    else focusFirst();
  }, [entry, focusFirst, focusLast]);

  return (
    <MenuContext value={context}>
      <div
        ref={(element) => {
          listRef.current = element;
          if (typeof ref === "function") ref(element);
          else if (ref) ref.current = element;
        }}
        className={cx("mn-list", context?.classNames?.list)}
        style={style}
        onKeyDown={onKeyDown}
      >
        {children}
      </div>
    </MenuContext>
  );
}

/* ---------------------------------------------------------------- submenus */

export interface MenuSubProps {
  /** The label of the item that opens the submenu. */
  label: ReactNode;
  children: ReactNode;
  /** Drawn before the submenu's label, at the size of the text. */
  icon?: ReactNode;
  disabled?: boolean;
  className?: string;
}

/** How long the pointer must rest before a submenu opens or closes. */
const HOVER_DELAY = 140;
const CLOSE_DELAY = 220;

/** A nested menu, opened by hover, Enter, or the arrow key pointing into it. */
export function MenuSub({ label, children, icon, disabled = false, className }: MenuSubProps) {
  const parent = useMenuContext("MenuSub");
  const id = useId();
  const [open, setOpen] = useState(false);
  const [entry, setEntry] = useState<"first" | "last">("first");
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const cancel = () => clearTimeout(timer.current);
  const schedule = (next: boolean, delay: number) => {
    cancel();
    timer.current = setTimeout(() => setOpen(next), delay);
  };

  useEffect(() => cancel, []);

  const openNow = (from: "first" | "last") => {
    cancel();
    setEntry(from);
    setAnchor(triggerRef.current);
    setOpen(true);
  };

  const closeToTrigger = () => {
    cancel();
    setOpen(false);
    triggerRef.current?.focus();
  };

  const context = useMemo(
    () => ({ ...parent, depth: parent.depth + 1 }),
    [parent],
  );

  return (
    <>
      <div
        ref={triggerRef}
        role="menuitem"
        tabIndex={-1}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? `${id}-submenu` : undefined}
        aria-disabled={disabled || undefined}
        data-disabled={disabled || undefined}
        className={cx("mn-item", "mn-sub-trigger", parent.classNames?.item, className)}
        onPointerEnter={() => {
          if (!disabled) schedule(true, HOVER_DELAY);
        }}
        onPointerLeave={() => {
          if (open) schedule(false, CLOSE_DELAY);
          else cancel();
        }}
        onClick={(event) => {
          event.stopPropagation();
          if (!disabled) openNow("first");
        }}
        onKeyDown={(event) => {
          if (disabled) return;
          const forward = event.key === "ArrowRight";
          if (forward || event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            event.stopPropagation();
            openNow("first");
          }
        }}
      >
        {icon && <span className={cx("mn-icon", parent.classNames?.icon)}>{icon}</span>}
        <span className={cx("mn-label", parent.classNames?.label)}>{label}</span>
        <ChevronRightIcon className="mn-sub-arrow" width={14} height={14} />
      </div>

      {open && anchor && (
        <AnchoredPopover
          anchor={anchor}
          onClose={() => setOpen(false)}
          id={`${id}-submenu`}
          role="menu"
          label={typeof label === "string" ? label : undefined}
          side="right"
          align="start"
          gap={2}
          fitHeight
          minHeight={120}
          autoFocus={false}
          observeResize="self"
          // Manual: an `auto` popover closes every other one, which would take
          // the parent menu down with it the moment this opened.
          mode="manual"
          className={cx("mn-root", "mn-submenu", parent.classNames?.submenu)}
        >
          <div onPointerEnter={cancel} onPointerLeave={() => schedule(false, CLOSE_DELAY)}>
            <MenuPanel entry={entry} nested context={context} onDismiss={closeToTrigger}>
              {children}
            </MenuPanel>
          </div>
        </AnchoredPopover>
      )}
    </>
  );
}
