import type { CSSProperties, ReactNode } from "react";
import type {
  ComboboxLocaleText,
  ComboboxOption,
  ComboboxSize,
  OptionValue,
} from "../core/types";

export type ComboboxSlot =
  | "root"
  | "label"
  | "control"
  | "value"
  | "tag"
  | "popover"
  | "search"
  | "list"
  | "option"
  | "footer";

export interface ComboboxHandle<V extends OptionValue = string> {
  open(): void;
  close(): void;
  toggle(): void;
  focus(): void;
  clear(): void;
  getValue(): V[];
  getSelectedOptions(): ComboboxOption<V>[];
}

export interface OptionState {
  selected: boolean;
  active: boolean;
}

export interface ComboboxSharedProps<V extends OptionValue = string> {
  /**
   * The choices. Each needs a `value` and a `label`, and may carry a
   * `description`, a `group` heading, an icon or `disabled`. In `server`
   * mode these are the current results rather than the whole set.
   */
  options: readonly ComboboxOption<V>[];
  /** `client` filters `options` locally; `server` expects `options` to be the current results. */
  mode?: "client" | "server";
  /** Shows a loading row; keeps current options visible. */
  loading?: boolean;
  /** Called with the search text (debounced in server mode), and on open. */
  onSearchChange?(search: string): void;
  /** Debounce for `onSearchChange` in server mode. Default 250 ms. */
  searchDebounce?: number;
  /** Show the search box. Default true. When false, typing jumps to a matching option. */
  searchable?: boolean;
  /** More results are available; the list calls `onLoadMore` when scrolled near the end. */
  hasMore?: boolean;
  /**
   * Fetch the next page. Called once as the list nears its end, while
   * `hasMore` is true - so it must not fire again until the new options
   * have arrived.
   */
  onLoadMore?(): void;
  /**
   * Replaces the built-in search matching (client mode).
   * `NoInfer` keeps the option type coming from `options` and `value` only.
   */
  filterFn?(option: ComboboxOption<NoInfer<V>>, search: string): boolean;
  /**
   * Draw each row yourself. `state` carries whether the option is
   * selected, active or disabled, so the row can reflect them.
   */
  renderOption?(option: ComboboxOption<NoInfer<V>>, state: OptionState): ReactNode;
  /** Offers "Create …" when the search matches no option. */
  allowCreate?: boolean;
  /**
   * The text someone typed when they chose "Create ...". Adding it to
   * `options` and selecting it is yours to do.
   */
  onCreate?(label: string): void;
  /** The control's name, shown above it and linked to it. */
  label?: ReactNode;
  placeholder?: string;
  /** A hint under the label, linked as the control's description. */
  description?: ReactNode;
  /** Message shown below the control; also marks the control invalid. */
  error?: ReactNode;
  required?: boolean;
  disabled?: boolean;
  /** Show the clear button. Default true. */
  clearable?: boolean;
  /** Default `md`. */
  size?: ComboboxSize;
  /** Name for the hidden form input. */
  name?: string;
  id?: string;
  /** Max height of the option list in pixels. Default 280. */
  maxHeight?: number;
  /** `true` / `false` to force, or a count above which virtualization turns on (default 80). */
  virtualize?: boolean | number;
  /** Shown when nothing matches the search. Defaults to the locale text. */
  emptyMessage?: ReactNode;
  className?: string;
  classNames?: Partial<Record<ComboboxSlot, string>>;
  style?: CSSProperties;
  localeText?: Partial<ComboboxLocaleText>;
  /** The list opened or closed. */
  onOpenChange?(open: boolean): void;
  /** Names the control when there is no visible `label`. */
  "aria-label"?: string;
}

// Shared with every other component, so class handling cannot drift.
export { cx } from "../../shared/core/cx";
