"use client";

import {
  useDeferredValue,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
  type Ref,
} from "react";
import { computeLayout, createSelectionColumn, resolveColumns } from "../core/columns";
import { filterRows } from "../core/filtering";
import { createGridEngine, type GridApi, type GridSnapshot } from "../core/grid";
import { buildRows, createRowIdGetter, paginate } from "../core/rows";
import { sortRows } from "../core/sorting";
import { shallowEqual } from "../core/store";
import type { Density, GridOptions } from "../core/types";
import { createFormatters } from "../core/values";
import { ColumnMenu } from "./ColumnMenu";
import { GridContext, cx, type GridContextValue, type GridSlot } from "./context";
import { usePopoverState, useStoreSelector } from "./hooks";
import { defaultLocaleText, type LocaleText } from "./locale";
import { Pagination } from "./Pagination";
import { Popover } from "./Popover";
import { Toolbar, type ToolbarOptions } from "./Toolbar";
import { AskGrid } from "./AskGrid";
import { createGridAgent, type GridAgent } from "../agent/engine";
import type { GridAgentPolicy, GridColumnSemantics } from "../agent/contract";
import { GridViewport } from "./Viewport";

export interface DataGridProps<T> extends GridOptions<T> {
  ref?: Ref<GridApi<T>>;
  /** Height of the scrolling area. Ignored with `autoHeight`. Default 520. */
  height?: number | string;
  /** Grow to fit all rows instead of scrolling (use with pagination or small data). */
  autoHeight?: boolean;
  /** Fixed row height in px. Defaults to the density's height. */
  rowHeight?: number;
  /** Fixed header height in px. Defaults to the density's row height. */
  headerHeight?: number;
  /**
   * Show the loading treatment over the grid. The existing rows stay in place
   * underneath, so a refresh does not empty the screen.
   */
  loading?: boolean;
  /**
   * The toolbar above the grid. `true` for all of it, `false` for none, or an
   * object to choose parts — `{ search: true, export: false }` — and to put
   * your own controls at its `start` or `end`.
   */
  toolbar?: boolean | ToolbarOptions;
  /** Page sizes offered in the pager. Default `[25, 50, 100, 250]`. */
  pageSizeOptions?: number[];
  /**
   * Shown in place of rows when there are none. Worth distinguishing "nothing
   * here yet" from "nothing matched your filters", which the default does not.
   */
  emptyState?: ReactNode;
  /** A class per row, for status colouring. Return undefined for no class. */
  getRowClassName?(row: T, rowIndex: number): string | undefined;
  classNames?: Partial<Record<GridSlot, string>>;
  className?: string;
  style?: CSSProperties;
  /** BCP 47 locale for number and date formatting. */
  locale?: string;
  localeText?: Partial<LocaleText>;
  "aria-label"?: string;
  /**
   * Render a natural-language box above the grid.
   *
   * Needs a `<GramproAIProvider>` above it supplying an adapter; without one
   * this renders nothing and the grid is unchanged. No model is bundled or
   * downloaded — the application brings its own.
   */
  ai?: boolean;
  /** What a machine cannot read off a column definition: units, synonyms, PII. */
  semantics?: Readonly<Record<string, GridColumnSemantics>>;
  /** Columns and operations withheld from whatever is driving the grid. */
  agentPolicy?: GridAgentPolicy;
}

const ROW_HEIGHTS: Record<Density, number> = { compact: 32, standard: 40, comfortable: 52 };
const DEFAULT_PAGE_SIZES = [25, 50, 100, 250];
const EMPTY_CLASSNAMES: Partial<Record<GridSlot, string>> = {};

const selectModelState = ({ state }: GridSnapshot) => ({
  sorting: state.sorting,
  filters: state.filters,
  globalFilter: state.globalFilter,
  pagination: state.pagination,
  columnOrder: state.columnOrder,
  columnVisibility: state.columnVisibility,
  columnSizing: state.columnSizing,
  columnPinning: state.columnPinning,
  density: state.density,
});

export function DataGrid<T>(props: DataGridProps<T>) {
  const {
    ref,
    data,
    columns: columnDefs,
    getRowId,
    mode = "client",
    rowCount,
    state: controlled,
    enablePagination = true,
    enableSorting = true,
    enableFiltering = true,
    enableColumnResizing = true,
    enableColumnReordering = true,
    enableColumnPinning = true,
    enableColumnHiding = true,
    enableRowSelection = false,
    selectionMode = "multiple",
    height = 520,
    autoHeight = false,
    loading = false,
    toolbar = true,
    pageSizeOptions = DEFAULT_PAGE_SIZES,
    emptyState,
    getRowClassName,
    classNames = EMPTY_CLASSNAMES,
    className,
    style,
    locale,
    localeText: localeOverrides,
    ai = false,
    semantics,
    agentPolicy,
  } = props;

  const [engine] = useState(() => createGridEngine<T>(props));
  useImperativeHandle(ref, () => engine.api, [engine]);

  /*
   * The agent is built once, from the same engine the grid renders, so the
   * contract it advertises is this instance's real state rather than a copy.
   * Only when `ai` is on: an agent walks the data to derive column stats and
   * enum values, which a grid nobody is going to ask questions of should not
   * pay for.
   */
  const [agent] = useState<GridAgent<T> | null>(() =>
    ai
      ? createGridAgent<T>({
          api: engine.api,
          options: props,
          semantics,
          policy: agentPolicy,
          locale,
        })
      : null,
  );

  // Selection and UI state are deliberately not selected here: changing them
  // re-renders only the rows and cells that subscribe to them.
  const internal = useStoreSelector(engine.store, selectModelState, shallowEqual);
  const sorting = controlled?.sorting ?? internal.sorting;
  const filters = controlled?.filters ?? internal.filters;
  const globalFilter = controlled?.globalFilter ?? internal.globalFilter;
  const pagination = controlled?.pagination ?? internal.pagination;
  const columnOrder = controlled?.columnOrder ?? internal.columnOrder;
  const columnVisibility = controlled?.columnVisibility ?? internal.columnVisibility;
  const columnSizing = controlled?.columnSizing ?? internal.columnSizing;
  const columnPinning = controlled?.columnPinning ?? internal.columnPinning;
  const density = controlled?.density ?? internal.density;

  const localeText = useMemo(() => ({ ...defaultLocaleText, ...localeOverrides }), [localeOverrides]);
  const formatters = useMemo(
    () => createFormatters(locale, { yes: localeText.yes, no: localeText.no }),
    [locale, localeText.yes, localeText.no],
  );
  const numberFormat = useMemo(() => new Intl.NumberFormat(locale), [locale]);

  // Row pipeline: each stage recomputes only when its own inputs change.
  const server = mode === "server";
  const rowIdGetter = useMemo(() => createRowIdGetter(getRowId), [getRowId]);
  const columns = useMemo(() => resolveColumns(columnDefs), [columnDefs]);
  const coreRows = useMemo(() => buildRows(data, rowIdGetter), [data, rowIdGetter]);

  const liveQuery = useMemo(
    () => ({ sorting, filters, globalFilter, pagination }),
    [sorting, filters, globalFilter, pagination],
  );
  // Filtering and sorting large data render at low priority, so typing stays responsive.
  const query = useDeferredValue(liveQuery);
  const stale = query !== liveQuery;

  const filteredRows = useMemo(
    () => (server ? coreRows : filterRows(coreRows, columns, query.filters, query.globalFilter, formatters)),
    [server, coreRows, columns, query.filters, query.globalFilter, formatters],
  );
  const sortedRows = useMemo(
    () => (server ? filteredRows : sortRows(filteredRows, columns, query.sorting, locale)),
    [server, filteredRows, columns, query.sorting, locale],
  );
  const page = useMemo(
    () => paginate(sortedRows, query.pagination, { enabled: enablePagination, server, rowCount }),
    [sortedRows, query.pagination, enablePagination, server, rowCount],
  );

  const hasSelection = enableRowSelection !== false;
  const leadingColumns = useMemo(() => (hasSelection ? [createSelectionColumn<T>()] : []), [hasSelection]);
  const layout = useMemo(
    () => computeLayout(columns, { columnOrder, columnVisibility, columnSizing, columnPinning }, leadingColumns),
    [columns, columnOrder, columnVisibility, columnSizing, columnPinning, leadingColumns],
  );

  const rowHeight = props.rowHeight ?? ROW_HEIGHTS[density];
  const headerHeight = props.headerHeight ?? Math.max(40, rowHeight);

  // Hand the committed props and model to the engine for event handlers.
  useLayoutEffect(() => {
    engine.sync(props, { columns, coreRows, sortedRows, page, layout, rowHeight, headerHeight, formatters });
  });

  const menu = usePopoverState<string>();
  const openMenu = menu.open;

  const isRowSelectable = useMemo(
    () =>
      typeof enableRowSelection === "function" ? enableRowSelection : () => enableRowSelection === true,
    [enableRowSelection],
  );

  const context = useMemo<GridContextValue<T>>(
    () => ({
      engine,
      locale: localeText,
      classNames,
      formatters,
      numberFormat,
      controlledSelection: controlled?.rowSelection,
      isRowSelectable,
      openColumnMenu: (columnId, anchor) => openMenu(anchor, columnId),
      features: {
        sorting: enableSorting,
        filtering: enableFiltering,
        resizing: enableColumnResizing,
        reordering: enableColumnReordering,
        pinning: enableColumnPinning,
        hiding: enableColumnHiding,
        selection: hasSelection,
        selectionMode,
      },
    }),
    [
      engine,
      localeText,
      classNames,
      formatters,
      numberFormat,
      controlled?.rowSelection,
      isRowSelectable,
      openMenu,
      enableSorting,
      enableFiltering,
      enableColumnResizing,
      enableColumnReordering,
      enableColumnPinning,
      enableColumnHiding,
      hasSelection,
      selectionMode,
    ],
  );

  const toolbarOptions: ToolbarOptions | null =
    toolbar === false
      ? null
      : {
          search: true,
          filterChips: true,
          columns: true,
          density: true,
          export: true,
          ...(toolbar === true ? {} : toolbar),
        };

  const menuAnchor = menu.state?.anchor ?? null;
  const menuItem = menu.state ? layout.columns.find((i) => i.column.id === menu.state?.payload) : undefined;
  const closeMenu = () => menu.close(menuAnchor);

  return (
    <GridContext value={context as unknown as GridContextValue<unknown>}>
      <div
        className={cx("dg-root", classNames.root, className)}
        style={
          {
            ...style,
            "--dg-row-height": `${rowHeight}px`,
            "--dg-header-height": `${headerHeight}px`,
          } as CSSProperties
        }
        data-density={density}
        data-stale={stale || undefined}
      >
        {ai && <AskGrid agent={agent} aria-label={props['aria-label']} />}

        {toolbarOptions && (
          <Toolbar
            options={toolbarOptions}
            globalFilter={globalFilter}
            filters={filters}
            density={density}
            columns={columns}
            columnVisibility={columnVisibility}
          />
        )}

        <GridViewport
          layout={layout}
          page={page}
          sortedRows={sortedRows}
          sorting={sorting}
          filters={filters}
          hasQuery={filters.length > 0 || globalFilter !== ""}
          rowHeight={rowHeight}
          headerHeight={headerHeight}
          height={autoHeight ? undefined : height}
          loading={loading}
          emptyState={emptyState}
          ariaLabel={props["aria-label"] ?? localeText.gridLabel}
          getRowClassName={getRowClassName}
        />

        {enablePagination && (
          <Pagination page={page} pageSize={pagination.pageSize} pageSizeOptions={pageSizeOptions} />
        )}

        {menuAnchor && menuItem && (
          <Popover
            anchor={menuAnchor}
            onClose={closeMenu}
            label={localeText.columnMenu(menuItem.column.header)}
            className="dg-column-menu-popover"
          >
            <ColumnMenu
              item={menuItem}
              layout={layout}
              sort={sorting.find((s) => s.columnId === menuItem.column.id)}
              filter={filters.find((f) => f.columnId === menuItem.column.id)}
              onClose={closeMenu}
            />
          </Popover>
        )}
      </div>
    </GridContext>
  );
}
