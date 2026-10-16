"use client";

import {
  use,
  useId,
  useMemo,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import { CheckIcon } from "../../shared/react/icons";
import { MenuRadioContext, useMenuContext } from "./context";
import { cx } from "./props";

interface BaseItemProps {
  children: ReactNode;
  /** Drawn before the label, at the size of the text. */
  icon?: ReactNode;
  /** A hint such as ⌘K. The menu shows it; binding the key is up to you. */
  shortcut?: ReactNode;
  disabled?: boolean;
  /** Styles it as a destructive action. */
  destructive?: boolean;
  className?: string;
}

export interface MenuItemProps extends BaseItemProps {
  /** Called when the item is chosen, by click, Enter or Space. */
  onSelect?(): void;
  /** Keep the menu open after choosing. Defaults to the Menu's `closeOnSelect`. */
  closeOnSelect?: boolean;
}

/**
 * Disabled items stay focusable, as the WAI-ARIA menu pattern prefers: someone
 * navigating by keyboard should be able to find out that an action exists but
 * is unavailable, rather than have it silently skipped. `useMenuKeys` does skip
 * them when arrowing, so they never trap the sequence.
 */
function itemAttributes(disabled: boolean, destructive: boolean) {
  return {
    tabIndex: -1,
    "aria-disabled": disabled || undefined,
    "data-disabled": disabled || undefined,
    "data-destructive": destructive || undefined,
  } as const;
}

/** Runs an action on Enter or Space, the keys the pattern reserves for choosing. */
function activationKeys(run: () => void) {
  return (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    event.stopPropagation();
    run();
  };
}

export function MenuItem(props: MenuItemProps) {
  const {
    children,
    icon,
    shortcut,
    disabled = false,
    destructive = false,
    onSelect,
    closeOnSelect,
    className,
  } = props;
  const menu = useMenuContext("MenuItem");

  const choose = () => {
    if (disabled) return;
    onSelect?.();
    if (closeOnSelect ?? menu.closeOnSelect) menu.close("select");
  };

  return (
    <div
      role="menuitem"
      {...itemAttributes(disabled, destructive)}
      className={cx("mn-item", menu.classNames?.item, className)}
      onClick={(event: MouseEvent<HTMLElement>) => {
        event.stopPropagation();
        choose();
      }}
      onKeyDown={activationKeys(choose)}
    >
      {icon && <span className={cx("mn-icon", menu.classNames?.icon)}>{icon}</span>}
      <span className={cx("mn-label", menu.classNames?.label)}>{children}</span>
      {shortcut && (
        <span className={cx("mn-shortcut", menu.classNames?.shortcut)}>{shortcut}</span>
      )}
    </div>
  );
}

export interface MenuCheckboxItemProps extends BaseItemProps {
  /** Ticked (controlled). */
  checked?: boolean;
  /** The state after a toggle, as a plain boolean. */
  onCheckedChange?(checked: boolean): void;
  /** Default false: toggling several options in a row is the usual case. */
  closeOnSelect?: boolean;
}

export function MenuCheckboxItem(props: MenuCheckboxItemProps) {
  const {
    children,
    icon,
    shortcut,
    checked = false,
    onCheckedChange,
    disabled = false,
    destructive = false,
    closeOnSelect = false,
    className,
  } = props;
  const menu = useMenuContext("MenuCheckboxItem");

  const toggle = () => {
    if (disabled) return;
    onCheckedChange?.(!checked);
    if (closeOnSelect) menu.close("select");
  };

  return (
    <div
      role="menuitemcheckbox"
      aria-checked={checked}
      {...itemAttributes(disabled, destructive)}
      className={cx("mn-item", menu.classNames?.item, className)}
      onClick={(event: MouseEvent<HTMLElement>) => {
        event.stopPropagation();
        toggle();
      }}
      onKeyDown={activationKeys(toggle)}
    >
      <span className={cx("mn-indicator", menu.classNames?.indicator)} aria-hidden="true">
        {checked && <CheckIcon width={14} height={14} />}
      </span>
      {icon && <span className={cx("mn-icon", menu.classNames?.icon)}>{icon}</span>}
      <span className={cx("mn-label", menu.classNames?.label)}>{children}</span>
      {shortcut && (
        <span className={cx("mn-shortcut", menu.classNames?.shortcut)}>{shortcut}</span>
      )}
    </div>
  );
}

export interface MenuRadioGroupProps {
  /** The chosen value (controlled). */
  value?: string;
  /** The newly chosen value. */
  onValueChange?(value: string): void;
  /** Names the group, and is shown above it when it is a string. */
  label?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function MenuRadioGroup({
  value,
  onValueChange,
  label,
  children,
  className,
}: MenuRadioGroupProps) {
  const menu = useMenuContext("MenuRadioGroup");
  const id = useId();
  const context = useMemo(
    () => ({ value, select: (next: string) => onValueChange?.(next) }),
    [value, onValueChange],
  );

  return (
    <MenuRadioContext value={context}>
      <div
        role="group"
        aria-labelledby={label ? `${id}-label` : undefined}
        className={cx("mn-group", menu.classNames?.group, className)}
      >
        {label && (
          <div id={`${id}-label`} className={cx("mn-group-label", menu.classNames?.groupLabel)}>
            {label}
          </div>
        )}
        {children}
      </div>
    </MenuRadioContext>
  );
}

export interface MenuRadioItemProps extends BaseItemProps {
  value: string;
  /** Default false, so a list of choices can be tried without reopening. */
  closeOnSelect?: boolean;
}

export function MenuRadioItem(props: MenuRadioItemProps) {
  const { children, icon, shortcut, value, disabled = false, closeOnSelect = false, className } = props;
  const menu = useMenuContext("MenuRadioItem");
  const group = use(MenuRadioContext);
  if (!group) throw new Error("MenuRadioItem must be rendered inside a <MenuRadioGroup>.");

  const checked = group.value === value;
  const choose = () => {
    if (disabled) return;
    group.select(value);
    if (closeOnSelect) menu.close("select");
  };

  return (
    <div
      role="menuitemradio"
      aria-checked={checked}
      {...itemAttributes(disabled, false)}
      className={cx("mn-item", menu.classNames?.item, className)}
      onClick={(event: MouseEvent<HTMLElement>) => {
        event.stopPropagation();
        choose();
      }}
      onKeyDown={activationKeys(choose)}
    >
      <span className={cx("mn-indicator", menu.classNames?.indicator)} aria-hidden="true">
        {checked && <span className="mn-dot" />}
      </span>
      {icon && <span className={cx("mn-icon", menu.classNames?.icon)}>{icon}</span>}
      <span className={cx("mn-label", menu.classNames?.label)}>{children}</span>
      {shortcut && (
        <span className={cx("mn-shortcut", menu.classNames?.shortcut)}>{shortcut}</span>
      )}
    </div>
  );
}

export interface MenuGroupProps {
  label?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** A titled section. The title is a label, not an item, so it is never focused. */
export function MenuGroup({ label, children, className }: MenuGroupProps) {
  const menu = useMenuContext("MenuGroup");
  const id = useId();

  return (
    <div
      role="group"
      aria-labelledby={label ? `${id}-label` : undefined}
      className={cx("mn-group", menu.classNames?.group, className)}
    >
      {label && (
        <div id={`${id}-label`} className={cx("mn-group-label", menu.classNames?.groupLabel)}>
          {label}
        </div>
      )}
      {children}
    </div>
  );
}

export function MenuSeparator({ className }: { className?: string }) {
  const menu = useMenuContext("MenuSeparator");
  return (
    <div
      role="separator"
      className={cx("mn-separator", menu.classNames?.separator, className)}
    />
  );
}
