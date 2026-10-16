"use client";

import { useMemo, type ReactNode } from "react";
import { isFilterActive } from "../core/filtering";
import type { ColumnFilter, Density, FilterValue, ResolvedColumn, RowId } from "../core/types";
import { toTime } from "../core/values";
import { cx, useGridContext } from "./context";
import { usePopoverState, useSelectionState } from "./hooks";
import { ColumnsIcon, DensityIcon, DownloadIcon, SearchIcon, XIcon } from "./icons";
import type { LocaleText } from "./locale";
import { Popover } from "./Popover";

export interface ToolbarOptions {
  search?: boolean;
  filterChips?: boolean;
  columns?: boolean;
  density?: boolean;
  export?: boolean;
  /** Rendered at the start of the toolbar. */
  start?: ReactNode;
  /** Rendered at the end of the toolbar. */
  end?: ReactNode;
}

interface ToolbarProps<T> {
  options: ToolbarOptions;
  globalFilter: string;
  filters: ColumnFilter[];
  density: Density;
  columns: ResolvedColumn<T>[];
  columnVisibility: Record<string, boolean>;
}

export function Toolbar<T>({ options, globalFilter, filters, density, columns, columnVisibility }: ToolbarProps<T>) {
  const { engine, locale, classNames, features } = useGridContext<T>();
  const { api } = engine;
  const activeFilters = filters.filter(isFilterActive);

  const densities: [Density, string][] = [
    ["compact", locale.densityCompact],
    ["standard", locale.densityStandard],
    ["comfortable", locale.densityComfortable],
  ];

  return (
    <div className={cx("dg-toolbar", classNames.toolbar)}>
      {options.start}

      {options.search && (
        <div className="dg-search">
          <SearchIcon />
          <input
            type="search"
            value={globalFilter}
            placeholder={locale.searchPlaceholder}
            aria-label={locale.search}
            onChange={(event) => api.setGlobalFilter(event.target.value)}
          />
        </div>
      )}

      {options.filterChips && activeFilters.length > 0 && (
        <div className="dg-chips">
          {activeFilters.map((filter) => {
            const column = columns.find((c) => c.id === filter.columnId);
            if (!column) return null;
            const label = describeFilter(filter, column, locale);
            return (
              <span key={filter.columnId} className="dg-chip">
                {label}
                <button
                  type="button"
                  className="dg-chip-remove"
                  aria-label={locale.removeFilter(label)}
                  onClick={() => api.setFilter(filter.columnId, null)}
                >
                  <XIcon width={12} height={12} />
                </button>
              </span>
            );
          })}
          <button type="button" className="dg-link-button" onClick={() => api.clearFilters()}>
            {locale.clearFilters}
          </button>
        </div>
      )}

      <SelectionSummary />
      <div className="dg-toolbar-spacer" />

      {options.density && (
        <ToolbarMenu label={locale.density} icon={<DensityIcon />}>
          {(close) => (
            <div className="dg-menu-section" role="radiogroup" aria-label={locale.density}>
              {densities.map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={density === value}
                  className="dg-menu-item"
                  onClick={() => {
                    api.setDensity(value);
                    close();
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </ToolbarMenu>
      )}

      {options.columns && features.hiding && (
        <ToolbarMenu label={locale.columns} icon={<ColumnsIcon />}>
          {() => <ColumnVisibilityList columns={columns} columnVisibility={columnVisibility} />}
        </ToolbarMenu>
      )}

      {options.export && (
        <ToolbarMenu label={locale.export} icon={<DownloadIcon />}>
          {(close) => (
            <div className="dg-menu-section">
              {(
                [
                  [locale.exportCsv, () => api.exportCsv()],
                  [locale.exportExcel, () => api.exportExcel()],
                  [locale.exportPdf, () => api.exportPdf()],
                  [locale.print, () => api.print()],
                ] as const
              ).map(([label, action]) => (
                <button
                  key={label}
                  type="button"
                  className="dg-menu-item"
                  onClick={() => {
                    close();
                    void action();
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </ToolbarMenu>
      )}

      {options.end}
    </div>
  );
}

function ToolbarMenu({
  label,
  icon,
  children,
}: {
  label: string;
  icon: ReactNode;
  children: (close: () => void) => ReactNode;
}) {
  const menu = usePopoverState();
  const anchor = menu.state?.anchor ?? null;
  const close = () => menu.close(anchor);

  return (
    <>
      <button
        type="button"
        className="dg-button"
        aria-haspopup="dialog"
        aria-expanded={anchor !== null}
        onClick={(event) => menu.open(event.currentTarget)}
      >
        {icon}
        <span className="dg-button-label">{label}</span>
      </button>
      {anchor && (
        <Popover anchor={anchor} onClose={close} label={label} align="end">
          {children(close)}
        </Popover>
      )}
    </>
  );
}

function SelectionSummary<T>() {
  const { engine, locale, features, numberFormat } = useGridContext<T>();
  const selection = useSelectionState<T, Record<RowId, boolean>>((s) => s);
  const count = useMemo(() => Object.values(selection).filter(Boolean).length, [selection]);

  if (!features.selection || count === 0) return null;
  return (
    <div className="dg-selection" role="status">
      {locale.selected(numberFormat.format(count))}
      <button type="button" className="dg-link-button" onClick={() => engine.api.clearSelection()}>
        {locale.clearSelection}
      </button>
    </div>
  );
}

function ColumnVisibilityList<T>({
  columns,
  columnVisibility,
}: {
  columns: ResolvedColumn<T>[];
  columnVisibility: Record<string, boolean>;
}) {
  const { engine, locale } = useGridContext<T>();
  const visibleCount = columns.filter((c) => columnVisibility[c.id] !== false).length;

  return (
    <div className="dg-menu-section">
      <div className="dg-check-list">
        {columns.map((column) => {
          const visible = columnVisibility[column.id] !== false;
          return (
            <label key={column.id}>
              <input
                type="checkbox"
                className="dg-checkbox"
                checked={visible}
                disabled={!column.hideable || (visible && visibleCount === 1)}
                onChange={() => engine.api.setColumnVisibility(column.id, !visible)}
              />
              {column.header}
            </label>
          );
        })}
      </div>
      <button type="button" className="dg-menu-item" onClick={() => engine.api.resetColumns()}>
        {locale.resetColumns}
      </button>
    </div>
  );
}

function describeFilter<T>(filter: ColumnFilter, column: ResolvedColumn<T>, locale: LocaleText): string {
  const operator = locale.operators[filter.operator];
  const format = (value: FilterValue | undefined): string => {
    if (value === null || value === undefined || value === "") return "…";
    if (typeof value === "boolean") return value ? locale.yes : locale.no;
    if (Array.isArray(value)) {
      return value
        .map((v) => column.def.options?.find((o) => o.value === v)?.label ?? String(v))
        .join(", ");
    }
    if (column.type === "date") {
      const time = toTime(value);
      return time === null ? String(value) : new Date(time).toLocaleDateString();
    }
    return String(value);
  };

  switch (filter.operator) {
    case "isEmpty":
    case "isNotEmpty":
      return `${column.header} ${operator}`;
    case "between":
      return `${column.header} ${format(filter.value)} – ${format(filter.value2)}`;
    default:
      return `${column.header} ${operator} ${format(filter.value)}`;
  }
}
