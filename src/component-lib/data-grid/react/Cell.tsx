"use client";

import {
  memo,
  useLayoutEffect,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import type { MoveDirection } from "../core/grid";
import type { ColumnLayoutItem, GridRow, ResolvedColumn } from "../core/types";
import { formatCellValue, toDateInputValue, toTime } from "../core/values";
import { cx, NO_PENDING, useGridContext } from "./context";
import { useFocusWhenActive } from "./hooks";
import { CheckIcon } from "./icons";

interface CellProps<T> {
  row: GridRow<T>;
  rowIndex: number;
  item: ColumnLayoutItem<T>;
  active: boolean;
  editing: boolean;
  /** Value of an in-flight async edit, or NO_PENDING. */
  pendingValue: unknown;
  error: string | undefined;
  selected: boolean;
  selectable: boolean;
}

const noop = () => {};

function CellView<T>({ row, rowIndex, item, active, editing, pendingValue, error, selected, selectable }: CellProps<T>) {
  const { engine, locale, classNames, formatters } = useGridContext<T>();
  const ref = useRef<HTMLDivElement>(null);
  useFocusWhenActive(ref, active, editing);

  const { column } = item;
  const hasPending = pendingValue !== NO_PENDING;
  const value = hasPending ? pendingValue : column.getValue(row.original);
  const editable = !column.internal && engine.isCellEditable(row.original, column);

  let content: ReactNode;
  if (column.internal) {
    content = (
      <input
        type="checkbox"
        className="dg-checkbox"
        tabIndex={-1}
        aria-label={locale.selectRow}
        checked={selected}
        disabled={!selectable}
        onChange={noop}
        onClick={(event) => {
          event.stopPropagation();
          engine.api.toggleRowSelected(row.id, { range: event.shiftKey });
        }}
      />
    );
  } else if (editing) {
    content = <CellEditor row={row} column={column} initialValue={value} />;
  } else if (column.def.cell) {
    content = column.def.cell({ row: row.original, rowId: row.id, rowIndex, value, column });
  } else if (column.type === "boolean" && !column.def.format) {
    content = (
      <span className="dg-bool">
        {value ? <CheckIcon /> : null}
        <span className="dg-sr-only">{value ? locale.yes : locale.no}</span>
      </span>
    );
  } else {
    const text = formatCellValue(column, value, row.original, formatters);
    content = <span className="dg-cell-text">{text}</span>;
  }

  const { cellClassName } = column.def;
  const extraClass =
    typeof cellClassName === "function"
      ? cellClassName({ row: row.original, rowId: row.id, rowIndex, value, column })
      : cellClassName;

  return (
    <div
      ref={ref}
      role="gridcell"
      aria-colindex={item.visibleIndex + 1}
      aria-invalid={error ? true : undefined}
      tabIndex={active ? 0 : -1}
      title={error}
      className={cx("dg-cell", classNames.cell, extraClass)}
      style={item.style}
      data-col-index={item.visibleIndex}
      data-pinned={item.pinned || undefined}
      data-pin-edge={item.pinEdge || undefined}
      data-align={column.align}
      data-active={active || undefined}
      data-editable={editable || undefined}
      data-editing={editing || undefined}
      data-pending={hasPending || undefined}
      data-invalid={error ? "" : undefined}
      onClick={() => engine.setActiveCell(rowIndex, item.visibleIndex, { focus: false, scroll: false })}
      onDoubleClick={editable ? () => engine.api.startEditing(row.id, column.id) : undefined}
    >
      {content}
    </div>
  );
}

export const Cell = memo(CellView) as typeof CellView;

interface CellEditorProps<T> {
  row: GridRow<T>;
  column: ResolvedColumn<T>;
  initialValue: unknown;
}

function fromDateInput(raw: string, original: unknown): unknown {
  if (raw === "") return null;
  if (original instanceof Date) return new Date(toTime(raw)!);
  if (typeof original === "number") return toTime(raw);
  return raw;
}

function CellEditor<T>({ row, column, initialValue }: CellEditorProps<T>) {
  const { engine } = useGridContext<T>();
  const [draft, setDraft] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const target = containerRef.current?.querySelector<HTMLElement>("input, select, textarea, button, [tabindex]");
    target?.focus({ preventScroll: true });
    if (target instanceof HTMLInputElement && (target.type === "text" || target.type === "number")) {
      target.select();
    }
  }, []);

  // The engine ignores commits for a cell that is no longer being edited, so a
  // blur that follows Enter or Escape is harmless.
  const commit = (value: unknown = draft, move?: MoveDirection) => {
    const message = engine.commitEdit(row.id, column.id, value, move);
    if (message) setError(message);
  };

  const cancel = () => engine.api.cancelEditing();

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      cancel();
    } else if (event.key === "Enter" && !(event.target instanceof HTMLTextAreaElement)) {
      event.preventDefault();
      commit(draft, event.shiftKey ? "up" : "down");
    } else if (event.key === "Tab") {
      event.preventDefault();
      commit(draft, event.shiftKey ? "left" : "right");
    }
  };

  const onBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget)) commit();
  };

  const { editor, options } = column.def;
  const invalid = error ? true : undefined;
  let control: ReactNode;

  if (typeof editor === "function") {
    control = editor({
      value: draft,
      row: row.original,
      column,
      error,
      onChange: setDraft,
      commit: (value) => commit(value === undefined ? draft : value),
      cancel,
    });
  } else {
    const kind =
      editor ??
      (options
        ? "select"
        : column.type === "number"
          ? "number"
          : column.type === "date"
            ? "date"
            : column.type === "boolean"
              ? "checkbox"
              : "text");

    switch (kind) {
      case "select":
        control = (
          <select
            className="dg-editor-input"
            aria-label={column.header}
            aria-invalid={invalid}
            value={String(draft ?? "")}
            onChange={(event) => {
              const option = options?.find((o) => String(o.value) === event.target.value);
              setDraft(option ? option.value : event.target.value);
            }}
          >
            {options?.map((option) => (
              <option key={String(option.value)} value={String(option.value)}>
                {option.label}
              </option>
            ))}
          </select>
        );
        break;
      case "checkbox":
        control = (
          <input
            type="checkbox"
            className="dg-checkbox"
            aria-label={column.header}
            aria-invalid={invalid}
            checked={Boolean(draft)}
            onChange={(event) => setDraft(event.target.checked)}
          />
        );
        break;
      case "date":
        control = (
          <input
            type="date"
            className="dg-editor-input"
            aria-label={column.header}
            aria-invalid={invalid}
            value={toDateInputValue(draft)}
            onChange={(event) => setDraft(fromDateInput(event.target.value, initialValue))}
          />
        );
        break;
      case "number":
        control = (
          <input
            type="number"
            className="dg-editor-input"
            aria-label={column.header}
            aria-invalid={invalid}
            value={typeof draft === "number" && !Number.isNaN(draft) ? String(draft) : ""}
            onChange={(event) =>
              setDraft(event.target.value === "" ? null : event.target.valueAsNumber)
            }
          />
        );
        break;
      default:
        control = (
          <input
            type="text"
            className="dg-editor-input"
            aria-label={column.header}
            aria-invalid={invalid}
            value={draft === null || draft === undefined ? "" : String(draft)}
            onChange={(event) => setDraft(event.target.value)}
          />
        );
    }
  }

  return (
    <div
      ref={containerRef}
      className="dg-editor"
      onKeyDown={onKeyDown}
      onBlur={onBlur}
      onClick={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
    >
      {control}
      {error && (
        <span className="dg-editor-error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
