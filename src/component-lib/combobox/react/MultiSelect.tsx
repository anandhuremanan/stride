"use client";

import { useId, useImperativeHandle, useMemo, useRef, type Ref } from "react";
import { describeField } from "../../shared/core/field";
import type { ComboboxOption, OptionValue } from "../core/types";
import { ChevronIcon, XIcon } from "./icons";
import { Listbox } from "./Listbox";
import { defaultComboboxText } from "./locale";
import { ComboboxPopover } from "./Popover";
import { cx, type ComboboxHandle, type ComboboxSharedProps } from "./props";
import { useCombobox } from "./useCombobox";

export interface MultiSelectProps<V extends OptionValue = string> extends ComboboxSharedProps<V> {
  value?: V[];
  defaultValue?: V[];
  onChange?(values: NoInfer<V>[], options: ComboboxOption<NoInfer<V>>[]): void;
  /** Maximum number of selections. */
  max?: number;
  /** Tags shown before collapsing into "+N more". Default 3. */
  maxVisibleTags?: number;
  /** Show "Select all" / "Clear all" under the list. Default true. */
  showSelectAll?: boolean;
  /** Close the list after each choice. Default false. */
  closeOnSelect?: boolean;
  ref?: Ref<ComboboxHandle<V>>;
}

/** Multi-select combobox: tags, option search and select-all. */
export function MultiSelect<V extends OptionValue = string>(props: MultiSelectProps<V>) {
  const {
    ref,
    value,
    defaultValue,
    onChange,
    max,
    maxVisibleTags = 3,
    showSelectAll = true,
    closeOnSelect = false,
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
    multiple: true,
    closeOnSelect,
    max,
    value,
    defaultValue: defaultValue ?? [],
    onValuesChange: (values, selectedOptions) => onChange?.(values, selectedOptions),
    text,
    id,
  });

  const { selectedOptions } = combobox;
  const hidden = Math.max(0, selectedOptions.length - maxVisibleTags);
  const visibleTags = hidden > 0 ? selectedOptions.slice(0, maxVisibleTags) : selectedOptions;

  useImperativeHandle(ref, () => combobox.handle, [combobox.handle]);

  const selectableVisible = combobox.entries.filter(
    (entry) => !entry.option.disabled && !combobox.isSelected(entry.option.value),
  );
  const canSelectAll =
    showSelectAll &&
    selectableVisible.length > 0 &&
    (max === undefined || selectedOptions.length + selectableVisible.length <= max);

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
        {selectedOptions.length === 0 ? (
          <span className={cx("cb-value", classNames?.value)}>
            <span className="cb-placeholder">{placeholder}</span>
          </span>
        ) : (
          <span className="cb-tags">
            {visibleTags.map((option) => (
              <span key={String(option.value)} className={cx("cb-tag", classNames?.tag)}>
                <span className="cb-tag-label">{option.label}</span>
                {!disabled && (
                  <button
                    type="button"
                    tabIndex={-1}
                    className="cb-tag-remove"
                    aria-label={text.removeOption(option.label)}
                    onClick={(event) => {
                      event.stopPropagation();
                      combobox.removeValue(option.value);
                    }}
                  >
                    <XIcon width={12} height={12} />
                  </button>
                )}
              </span>
            ))}
            {hidden > 0 && <span className="cb-tag-overflow">{text.moreCount(String(hidden))}</span>}
          </span>
        )}

        <span className="cb-actions">
          {clearable && selectedOptions.length > 0 && !disabled && (
            <button
              type="button"
              tabIndex={-1}
              className="cb-icon-button"
              aria-label={text.clearAll}
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

      {name &&
        selectedOptions.map((option) => (
          <input key={String(option.value)} type="hidden" name={name} value={option.value} />
        ))}
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
            multiple
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
            footer={
              <>
                <span className="cb-footer-count">
                  {max !== undefined && selectedOptions.length >= max
                    ? text.maxReached(String(max))
                    : text.selectedCount(String(selectedOptions.length))}
                </span>
                <span>
                  {canSelectAll && (
                    <button
                      type="button"
                      className="cb-link-button"
                      onClick={() => combobox.selectAllVisible()}
                    >
                      {text.selectAll}
                    </button>
                  )}
                  {selectedOptions.length > 0 && (
                    <button type="button" className="cb-link-button" onClick={() => combobox.clear()}>
                      {text.clearAll}
                    </button>
                  )}
                </span>
              </>
            }
          />
        </ComboboxPopover>
      )}
      {options.length === 0 && loading && <span className="cb-sr-only">{text.loading}</span>}
    </div>
  );
}
