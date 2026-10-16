"use client";

import { useId, useImperativeHandle, useMemo, useRef, type Ref } from "react";
import { describeField } from "../../shared/core/field";
import type { ComboboxOption, OptionValue } from "../core/types";
import { defaultComboboxText } from "./locale";
import { ChevronIcon, XIcon } from "./icons";
import { Listbox } from "./Listbox";
import { ComboboxPopover } from "./Popover";
import { cx, type ComboboxHandle, type ComboboxSharedProps } from "./props";
import { useCombobox } from "./useCombobox";

export interface SelectProps<V extends OptionValue = string> extends ComboboxSharedProps<V> {
  value?: V | null;
  defaultValue?: V | null;
  /**
   * The chosen value, and the whole option beside it so the label and
   * anything else it carries need not be looked up again. Both are
   * `null` once the control is cleared.
   */
  onChange?(value: NoInfer<V> | null, option: ComboboxOption<NoInfer<V>> | null): void;
  /** Close the list after choosing. Default true; `false` keeps it open. */
  closeOnSelect?: boolean;
  ref?: Ref<ComboboxHandle<V>>;
}

/** Single-select combobox: a value picker with option search. */
export function Select<V extends OptionValue = string>(props: SelectProps<V>) {
  const {
    ref,
    value,
    defaultValue,
    onChange,
    closeOnSelect = true,
    options,
    label,
    placeholder = "Select…",
    description,
    error,
    required = false,
    disabled = false,
    clearable = true,
    size = "md",
    name,
    id: idProp,
    className,
    classNames,
    style,
    localeText,
    maxHeight = 280,
    virtualize = true,
    emptyMessage,
    searchable = true,
    loading = false,
    hasMore,
    onLoadMore,
    renderOption,
  } = props;

  const reactId = useId();
  const id = idProp ?? reactId;
  const text = useMemo(() => ({ ...defaultComboboxText, ...localeText }), [localeText]);

  const controlRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const combobox = useCombobox<V>({
    controlRef,
    searchRef,
    listRef,
    ...props,
    multiple: false,
    closeOnSelect,
    value: value === undefined ? undefined : value === null ? [] : [value],
    defaultValue: defaultValue === null || defaultValue === undefined ? [] : [defaultValue],
    onValuesChange: (values, selectedOptions) =>
      onChange?.(values[0] ?? null, selectedOptions[0] ?? null),
    text,
    id,
  });

  const selected = combobox.selectedOptions[0];

  useImperativeHandle(ref, () => combobox.handle, [combobox.handle]);

  return (
    <div
      className={cx("cb-root", classNames?.root, className)}
      style={style}
      data-size={size}
      data-state={combobox.open ? "open" : "closed"}
      data-invalid={error ? "" : undefined}
    >
      {label && (
        <span id={`${id}-label`} className={cx("cb-label", classNames?.label)} data-required={required || undefined}>
          {label}
        </span>
      )}

      <div
        ref={controlRef}
        id={id}
        role="combobox"
        tabIndex={disabled ? -1 : 0}
        aria-expanded={combobox.open}
        aria-haspopup="listbox"
        aria-controls={combobox.open ? combobox.listboxId : undefined}
        aria-labelledby={label ? `${id}-label` : undefined}
        aria-label={label ? undefined : props["aria-label"]}
        aria-describedby={describeField(id, { description, error })}
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        aria-disabled={disabled || undefined}
        className={cx("cb-control", classNames?.control)}
        data-disabled={disabled || undefined}
        data-invalid={error ? "" : undefined}
        onPointerDown={combobox.onControlPointerDown}
        onClick={combobox.onControlClick}
        onKeyDown={combobox.onKeyDown}
      >
        <span className={cx("cb-value", classNames?.value)}>
          {selected ? (
            <>
              {selected.icon && <span className="cb-value-icon">{selected.icon}</span>}
              {selected.label}
            </>
          ) : (
            <span className="cb-placeholder">{placeholder}</span>
          )}
        </span>

        <span className="cb-actions">
          {clearable && selected && !disabled && (
            <button
              type="button"
              tabIndex={-1}
              className="cb-icon-button"
              aria-label={text.clear}
              onClick={(event) => {
                event.stopPropagation();
                combobox.clear();
              }}
            >
              <XIcon width={14} height={14} />
            </button>
          )}
          <ChevronIcon className="cb-chevron" />
        </span>
      </div>

      {name && <input type="hidden" name={name} value={selected?.value ?? ""} />}
      {description && (
        <span id={`${id}-description`} className="cb-description">
          {description}
        </span>
      )}
      {error && (
        <span id={`${id}-error`} className="cb-error" role="alert">
          {error}
        </span>
      )}

      {combobox.anchor && (
        <ComboboxPopover
          anchor={combobox.anchor}
          onClose={combobox.onPopoverClose}
          className={classNames?.popover}
        >
          <Listbox<V>
            listboxId={combobox.listboxId}
            labelledBy={label ? `${id}-label` : id}
            items={combobox.items}
            optionCount={combobox.entries.length}
            activeIndex={combobox.activeIndex}
            multiple={false}
            size={size}
            maxHeight={maxHeight}
            virtualize={virtualize}
            loading={loading}
            hasMore={hasMore}
            searchable={searchable}
            search={combobox.search}
            searchRef={searchRef}
            listRef={listRef}
            text={text}
            classNames={classNames}
            emptyMessage={emptyMessage}
            createLabel={combobox.createLabel}
            getOptionId={combobox.getOptionId}
            isSelected={combobox.isSelected}
            onSelect={combobox.selectOption}
            onActiveIndexChange={combobox.setActiveIndex}
            onSearchChange={combobox.setSearch}
            onKeyDown={combobox.onKeyDown}
            onLoadMore={onLoadMore}
            onCreate={combobox.commitCreate}
            renderOption={renderOption}
          />
        </ComboboxPopover>
      )}
      {options.length === 0 && loading && <span className="cb-sr-only">{text.loading}</span>}
    </div>
  );
}
