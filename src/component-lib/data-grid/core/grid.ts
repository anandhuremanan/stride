import {
  getLayoutVars,
  moveColumn as moveColumnState,
  pinColumn as pinColumnState,
} from "./columns";
import type { PageResult } from "./rows";
import { toggleSorting } from "./sorting";
import {
  createInitialState,
  mergeState,
  pickQuery,
  queryChanged,
  resetsPage,
  STATE_KEYS,
} from "./state";
import { createStore } from "./store";
import type {
  ColumnFilter,
  ColumnLayout,
  Density,
  ExportOptions,
  ExportScope,
  GridOptions,
  GridRow,
  GridState,
  PdfExportOptions,
  PrintExportOptions,
  PinSide,
  ResolvedColumn,
  RowId,
  SortItem,
} from "./types";
import { formatCellValue, type Formatters } from "./values";
import type { Viewport } from "./virtual";

export interface CellPosition {
  /** -1 is the header row. */
  rowIndex: number;
  /** Index into `layout.columns` (visual order). */
  colIndex: number;
}

export interface UiState {
  activeCell: CellPosition | null;
  editing: { rowId: RowId; columnId: string } | null;
  /** Values shown while an async `onCellEdit` is in flight. */
  pending: Record<RowId, Record<string, unknown>>;
  /** Errors from rejected async edits. */
  errors: Record<RowId, Record<string, string>>;
}

export interface GridSnapshot {
  /** Internal (uncontrolled) state. Controlled props are merged in by the React layer. */
  state: GridState;
  ui: UiState;
}

/** Everything derived during render, handed to the engine after each commit. */
export interface GridModel<T> {
  columns: ResolvedColumn<T>[];
  coreRows: GridRow<T>[];
  /** Filtered and sorted rows (client mode); the current data in server mode. */
  sortedRows: GridRow<T>[];
  page: PageResult<T>;
  layout: ColumnLayout<T>;
  rowHeight: number;
  headerHeight: number;
  formatters: Formatters;
}

export type MoveDirection = "up" | "down" | "left" | "right";

/** Imperative API, available through the grid's `ref`. */
export interface GridApi<T> {
  getState(): GridState;
  setState(updater: (prev: GridState) => GridState): void;

  toggleSort(columnId: string, multi?: boolean): void;
  setSorting(sorting: SortItem[]): void;
  setFilter(columnId: string, filter: Omit<ColumnFilter, "columnId"> | null): void;
  clearFilters(): void;
  setGlobalFilter(value: string): void;
  setPageIndex(pageIndex: number): void;
  setPageSize(pageSize: number): void;
  setDensity(density: Density): void;

  isRowSelectable(row: T): boolean;
  toggleRowSelected(rowId: RowId, options?: { value?: boolean; range?: boolean }): void;
  /** Selects (or deselects) every row matching the current filters. */
  toggleAllRowsSelected(value: boolean): void;
  clearSelection(): void;
  getSelectedRowIds(): RowId[];
  getSelectedRows(): T[];

  setColumnVisibility(columnId: string, visible: boolean): void;
  setColumnWidth(columnId: string, width: number | null): void;
  pinColumn(columnId: string, side: PinSide | false): void;
  moveColumn(columnId: string, targetId: string, placement: "before" | "after"): void;
  resetColumns(): void;

  scrollToRow(rowIndex: number): void;
  focusCell(rowIndex: number, columnId: string): void;
  startEditing(rowId: RowId, columnId: string): void;
  cancelEditing(): void;

  getRows(scope?: ExportScope): T[];
  exportCsv(options?: ExportOptions<T>): Promise<void>;
  exportExcel(options?: ExportOptions<T>): Promise<void>;
  /** Renders a PDF and downloads it. No print dialog, no browser pagination. */
  exportPdf(options?: PdfExportOptions<T>): Promise<void>;
  /** Opens the browser's print dialog with the table laid out for paper. */
  print(options?: PrintExportOptions<T>): Promise<void>;
  /** Copies selected rows as TSV, or the active cell when nothing is selected. */
  copyToClipboard(): Promise<void>;
}

const EMPTY_UI: UiState = { activeCell: null, editing: null, pending: {}, errors: {} };

function setNested<V>(
  record: Record<RowId, Record<string, V>>,
  rowId: RowId,
  columnId: string,
  value: V | undefined,
): Record<RowId, Record<string, V>> {
  if (value === undefined && record[rowId]?.[columnId] === undefined) return record;
  const inner = { ...record[rowId] };
  if (value === undefined) delete inner[columnId];
  else inner[columnId] = value;
  const next = { ...record };
  if (Object.keys(inner).length > 0) next[rowId] = inner;
  else delete next[rowId];
  return next;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export function createGridEngine<T>(initialOptions: GridOptions<T>) {
  let options = initialOptions;
  let model: GridModel<T> | null = null;
  let viewportEl: HTMLElement | null = null;
  let focusRequested = false;
  let anchorRowId: RowId | null = null;
  let draggingColumnId: string | null = null;
  let rowLookup: { rows: GridRow<T>[]; map: Map<RowId, GridRow<T>> } | null = null;

  const store = createStore<GridSnapshot>({
    state: createInitialState(options),
    ui: EMPTY_UI,
  });
  const viewport = createStore<Viewport>({ scrollTop: 0, scrollLeft: 0, width: 0, height: 0 });

  const getState = () => mergeState(store.getSnapshot().state, options.state);

  const setUi = (updater: (ui: UiState) => UiState) =>
    store.setState((snapshot) => {
      const ui = updater(snapshot.ui);
      return ui === snapshot.ui ? snapshot : { ...snapshot, ui };
    });

  function setState(updater: (prev: GridState) => GridState) {
    const prev = getState();
    let next = updater(prev);
    if (next === prev) return;

    if (
      resetsPage(prev, next) &&
      next.pagination === prev.pagination &&
      prev.pagination.pageIndex !== 0
    ) {
      next = { ...next, pagination: { ...next.pagination, pageIndex: 0 } };
    }

    const controlled = options.state ?? {};
    store.setState((snapshot) => {
      let internal = snapshot.state;
      for (const key of STATE_KEYS) {
        if (next[key] !== prev[key] && controlled[key] === undefined) {
          if (internal === snapshot.state) internal = { ...internal };
          (internal as unknown as Record<string, unknown>)[key] = next[key];
        }
      }
      return internal === snapshot.state ? snapshot : { ...snapshot, state: internal };
    });

    if (next.pagination.pageIndex !== prev.pagination.pageIndex && viewportEl) {
      viewportEl.scrollTop = 0;
    }

    options.onStateChange?.(next, prev);
    if (queryChanged(prev, next)) options.onQueryChange?.(pickQuery(next));
  }

  const update = <K extends keyof GridState>(
    key: K,
    compute: (value: GridState[K]) => GridState[K],
  ) =>
    setState((prev) => {
      const value = compute(prev[key]);
      return value === prev[key] ? prev : { ...prev, [key]: value };
    });

  const getRowById = (rowId: RowId) => {
    const rows = model?.coreRows ?? [];
    if (rowLookup?.rows !== rows) {
      rowLookup = { rows, map: new Map(rows.map((row) => [row.id, row])) };
    }
    return rowLookup.map.get(rowId);
  };

  const getColumn = (columnId: string) =>
    model?.columns.find((column) => column.id === columnId);

  // ---------------------------------------------------------------- selection

  const isRowSelectable = (row: T) => {
    const enabled = options.enableRowSelection;
    return typeof enabled === "function" ? enabled(row) : enabled === true;
  };

  function toggleRowSelected(
    rowId: RowId,
    { value, range = false }: { value?: boolean; range?: boolean } = {},
  ) {
    const row = getRowById(rowId);
    if (!row || !isRowSelectable(row.original)) return;

    update("rowSelection", (selection) => {
      const target = value ?? !selection[rowId];
      if (options.selectionMode === "single") {
        return target ? { [rowId]: true } : {};
      }

      const next = { ...selection };
      const rows = model?.sortedRows ?? [];
      const from = range && anchorRowId !== null ? rows.findIndex((r) => r.id === anchorRowId) : -1;
      const to = from === -1 ? -1 : rows.findIndex((r) => r.id === rowId);

      if (from !== -1 && to !== -1) {
        for (let i = Math.min(from, to); i <= Math.max(from, to); i++) {
          if (!isRowSelectable(rows[i].original)) continue;
          if (target) next[rows[i].id] = true;
          else delete next[rows[i].id];
        }
      } else if (target) {
        next[rowId] = true;
      } else {
        delete next[rowId];
      }
      return next;
    });
    anchorRowId = rowId;
  }

  function toggleAllRowsSelected(value: boolean) {
    if (options.selectionMode === "single") return;
    const rows = model?.sortedRows ?? [];
    update("rowSelection", (selection) => {
      const next = { ...selection };
      for (const row of rows) {
        if (!isRowSelectable(row.original)) continue;
        if (value) next[row.id] = true;
        else delete next[row.id];
      }
      return next;
    });
  }

  const getSelectedRowIds = () =>
    Object.keys(getState().rowSelection).filter((id) => getState().rowSelection[id]);

  const getSelectedRows = () => {
    const selection = getState().rowSelection;
    return (model?.coreRows ?? []).filter((row) => selection[row.id]).map((row) => row.original);
  };

  // --------------------------------------------------------------- navigation

  function ensureVisible(rowIndex: number, colIndex: number) {
    const el = viewportEl;
    if (!el || !model) return;
    const { layout, rowHeight, headerHeight } = model;

    if (rowIndex >= 0) {
      const top = rowIndex * rowHeight;
      const bodyHeight = el.clientHeight - headerHeight;
      if (top < el.scrollTop) el.scrollTop = top;
      else if (top + rowHeight > el.scrollTop + bodyHeight) {
        el.scrollTop = top + rowHeight - bodyHeight;
      }
    }

    const item = layout.columns[colIndex];
    if (item && !item.pinned) {
      const rtl = getComputedStyle(el).direction === "rtl";
      const scroll = Math.abs(el.scrollLeft);
      const start = item.offset;
      const end = start + item.width;
      const visibleWidth = el.clientWidth - layout.leftWidth - layout.rightWidth;
      let nextScroll = scroll;
      if (start < scroll) nextScroll = start;
      else if (end > scroll + visibleWidth) nextScroll = end - visibleWidth;
      if (nextScroll !== scroll) el.scrollLeft = rtl ? -nextScroll : nextScroll;
    }

    // Scroll events are async; update the range now so the target renders this frame.
    viewport.setState((v) =>
      v.scrollTop === el.scrollTop && v.scrollLeft === el.scrollLeft
        ? v
        : { ...v, scrollTop: el.scrollTop, scrollLeft: el.scrollLeft },
    );
  }

  function setActiveCell(
    rowIndex: number,
    colIndex: number,
    { focus = true, scroll = true }: { focus?: boolean; scroll?: boolean } = {},
  ) {
    if (!model || model.layout.columns.length === 0) return;
    const position = {
      rowIndex: clamp(rowIndex, -1, model.page.rows.length - 1),
      colIndex: clamp(colIndex, 0, model.layout.columns.length - 1),
    };
    if (focus) focusRequested = true;
    setUi((ui) =>
      ui.activeCell?.rowIndex === position.rowIndex &&
      ui.activeCell.colIndex === position.colIndex
        ? ui
        : { ...ui, activeCell: position },
    );
    if (scroll) ensureVisible(position.rowIndex, position.colIndex);
    // Already active: nothing re-renders, so focus the element directly.
    if (focus && viewportEl) {
      const selector = `[data-row-index="${position.rowIndex}"] [data-col-index="${position.colIndex}"]`;
      const cell = viewportEl.querySelector<HTMLElement>(selector);
      if (cell && document.activeElement !== cell) {
        cell.focus({ preventScroll: true });
        focusRequested = false;
      }
    }
  }

  function moveActiveCell(direction: MoveDirection, by = 1) {
    const current = store.getSnapshot().ui.activeCell ?? { rowIndex: -1, colIndex: 0 };
    const dRow = direction === "up" ? -by : direction === "down" ? by : 0;
    const dCol = direction === "left" ? -by : direction === "right" ? by : 0;
    setActiveCell(current.rowIndex + dRow, current.colIndex + dCol);
  }

  // ------------------------------------------------------------------ editing

  const isCellEditable = (row: T, column: ResolvedColumn<T>) => {
    const { editable } = column.def;
    return typeof editable === "function" ? editable(row) : editable === true;
  };

  function startEditing(rowId: RowId, columnId: string) {
    const row = getRowById(rowId);
    const column = getColumn(columnId);
    if (!row || !column || !isCellEditable(row.original, column)) return;
    setUi((ui) => ({ ...ui, editing: { rowId, columnId } }));
  }

  function cancelEditing() {
    if (!store.getSnapshot().ui.editing) return;
    focusRequested = true;
    setUi((ui) => ({ ...ui, editing: null }));
  }

  /** Returns a validation error, or null when the edit was accepted. */
  function commitEdit(
    rowId: RowId,
    columnId: string,
    value: unknown,
    move?: MoveDirection,
  ): string | null {
    const editing = store.getSnapshot().ui.editing;
    if (editing?.rowId !== rowId || editing.columnId !== columnId) return null;

    const row = getRowById(rowId);
    const column = getColumn(columnId);
    if (!row || !column) return null;

    const error = column.def.validate?.(value, row.original);
    if (error) return error;

    focusRequested = true;
    setUi((ui) => ({ ...ui, editing: null, errors: setNested(ui.errors, rowId, columnId, undefined) }));

    const previousValue = column.getValue(row.original);
    if (!Object.is(previousValue, value) && options.onCellEdit) {
      const result = options.onCellEdit({ row: row.original, rowId, columnId, value, previousValue });
      if (result instanceof Promise) {
        setUi((ui) => ({ ...ui, pending: setNested(ui.pending, rowId, columnId, value) }));
        result.then(
          () => setUi((ui) => ({ ...ui, pending: setNested(ui.pending, rowId, columnId, undefined) })),
          (reason: unknown) =>
            setUi((ui) => ({
              ...ui,
              pending: setNested(ui.pending, rowId, columnId, undefined),
              errors: setNested(
                ui.errors,
                rowId,
                columnId,
                reason instanceof Error ? reason.message : String(reason),
              ),
            })),
        );
      }
    }

    if (move) moveActiveCell(move);
    return null;
  }

  // ------------------------------------------------------------------ columns

  function resetColumns() {
    const initial = createInitialState({ ...options, initialState: undefined });
    setState((prev) => ({
      ...prev,
      columnOrder: initial.columnOrder,
      columnVisibility: initial.columnVisibility,
      columnSizing: initial.columnSizing,
      columnPinning: initial.columnPinning,
    }));
  }

  /** Live resize: rewrites CSS variables without rendering. */
  function previewColumnWidth(columnId: string, width: number) {
    if (!viewportEl || !model) return;
    const vars = getLayoutVars(model.layout, { [columnId]: width });
    for (const [name, value] of Object.entries(vars)) {
      viewportEl.style.setProperty(name, value);
    }
  }

  // ------------------------------------------------------------------- export

  function getRows(scope: ExportScope = "filtered"): T[] {
    if (!model) return [];
    switch (scope) {
      case "all":
        return model.coreRows.map((row) => row.original);
      case "page":
        return model.page.rows.map((row) => row.original);
      case "selected":
        return getSelectedRows();
      default:
        return model.sortedRows.map((row) => row.original);
    }
  }

  async function buildTable(exportOptions: ExportOptions<T>) {
    const { buildExportTable } = await import("../export/table");
    const rows = exportOptions.rows ?? getRows(exportOptions.scope);
    const items = (model?.layout.columns ?? []).filter(
      (item) => !item.column.internal && item.column.exportable,
    );
    return buildExportTable(rows, items, model!.formatters);
  }

  const fileName = (exportOptions: ExportOptions<T>) =>
    exportOptions.fileName ?? options.exportFileName ?? "export";

  const api: GridApi<T> = {
    getState,
    setState,

    toggleSort: (columnId, multi = false) =>
      update("sorting", (sorting) =>
        toggleSorting(sorting, columnId, multi && options.enableMultiSort !== false),
      ),
    setSorting: (sorting) => update("sorting", () => sorting),
    setFilter: (columnId, filter) =>
      update("filters", (filters) => {
        const rest = filters.filter((f) => f.columnId !== columnId);
        if (!filter) return rest.length === filters.length ? filters : rest;
        return [...rest, { ...filter, columnId }];
      }),
    clearFilters: () =>
      setState((prev) =>
        prev.filters.length === 0 && prev.globalFilter === ""
          ? prev
          : { ...prev, filters: [], globalFilter: "" },
      ),
    setGlobalFilter: (value) => update("globalFilter", () => value),
    setPageIndex: (pageIndex) =>
      update("pagination", (p) =>
        p.pageIndex === pageIndex ? p : { ...p, pageIndex: Math.max(0, pageIndex) },
      ),
    setPageSize: (pageSize) =>
      update("pagination", (p) =>
        p.pageSize === pageSize
          ? p
          : { pageSize, pageIndex: Math.floor((p.pageIndex * p.pageSize) / pageSize) },
      ),
    setDensity: (density) => update("density", () => density),

    isRowSelectable,
    toggleRowSelected,
    toggleAllRowsSelected,
    clearSelection: () =>
      update("rowSelection", (selection) =>
        Object.keys(selection).length === 0 ? selection : {},
      ),
    getSelectedRowIds,
    getSelectedRows,

    setColumnVisibility: (columnId, visible) =>
      update("columnVisibility", (visibility) =>
        (visibility[columnId] !== false) === visible
          ? visibility
          : { ...visibility, [columnId]: visible },
      ),
    setColumnWidth: (columnId, width) =>
      update("columnSizing", (sizing) => {
        const next = { ...sizing };
        if (width === null) delete next[columnId];
        else next[columnId] = Math.round(width);
        return next;
      }),
    pinColumn: (columnId, side) =>
      update("columnPinning", (pinning) => pinColumnState(pinning, columnId, side)),
    moveColumn: (columnId, targetId, placement) =>
      setState((prev) => ({
        ...prev,
        ...moveColumnState(model?.columns ?? [], prev, columnId, targetId, placement),
      })),
    resetColumns,

    scrollToRow: (rowIndex) => ensureVisible(rowIndex, -1),
    focusCell: (rowIndex, columnId) => {
      const colIndex = model?.layout.columns.findIndex((item) => item.column.id === columnId) ?? -1;
      if (colIndex !== -1) setActiveCell(rowIndex, colIndex);
    },
    startEditing,
    cancelEditing,

    getRows,
    async exportCsv(exportOptions = {}) {
      const [{ createCsvBlob }, { downloadBlob }, table] = await Promise.all([
        import("../export/csv"),
        import("../export/download"),
        buildTable(exportOptions),
      ]);
      downloadBlob(createCsvBlob(table), `${fileName(exportOptions)}.csv`);
    },
    async exportExcel(exportOptions = {}) {
      const [{ createXlsxBlob }, { downloadBlob }, table] = await Promise.all([
        import("../export/xlsx"),
        import("../export/download"),
        buildTable(exportOptions),
      ]);
      downloadBlob(createXlsxBlob(table), `${fileName(exportOptions)}.xlsx`);
    },
    async exportPdf(exportOptions = {}) {
      const [{ createPdfBlob }, { downloadBlob }, table] = await Promise.all([
        import("../export/pdf"),
        import("../export/download"),
        buildTable(exportOptions),
      ]);
      const blob = await createPdfBlob(table, {
        title: exportOptions.title ?? fileName(exportOptions),
        orientation: exportOptions.orientation ?? "landscape",
        paperSize: exportOptions.paperSize ?? "A4",
        margin: exportOptions.margin,
        fontSize: exportOptions.fontSize,
        header: exportOptions.header,
        footer: exportOptions.footer,
        theme: exportOptions.theme,
      });
      downloadBlob(blob, `${fileName(exportOptions)}.pdf`);
    },
    async print(exportOptions = {}) {
      const [{ printTable }, table] = await Promise.all([
        import("../export/pdf"),
        buildTable(exportOptions),
      ]);
      printTable(table, {
        title: exportOptions.title ?? fileName(exportOptions),
        orientation: exportOptions.orientation ?? "landscape",
        paperSize: exportOptions.paperSize ?? "A4",
      });
    },
    async copyToClipboard() {
      if (!model) return;
      const selected = getSelectedRows();
      let text = "";
      if (selected.length > 0) {
        const { toTsv } = await import("../export/csv");
        text = toTsv(await buildTable({ rows: selected }));
      } else {
        const active = store.getSnapshot().ui.activeCell;
        const row = active && model.page.rows[active.rowIndex];
        const item = active && model.layout.columns[active.colIndex];
        if (row && item && !item.column.internal) {
          const value = item.column.getValue(row.original);
          text = formatCellValue(item.column, value, row.original, model.formatters);
        }
      }
      if (text) await navigator.clipboard.writeText(text);
    },
  };

  return {
    api,
    store,
    viewport,
    getOptions: () => options,
    getModel: () => model,
    /** Called after every commit with the latest props and derived model. */
    sync(nextOptions: GridOptions<T>, nextModel: GridModel<T>) {
      options = nextOptions;
      model = nextModel;
    },
    attachViewport(el: HTMLElement | null) {
      viewportEl = el;
    },
    setActiveCell,
    moveActiveCell,
    consumeFocusRequest() {
      const requested = focusRequested;
      focusRequested = false;
      return requested;
    },
    isRowSelectable,
    isCellEditable,
    commitEdit,
    previewColumnWidth,
    getDraggingColumn: () => draggingColumnId,
    setDraggingColumn(columnId: string | null) {
      draggingColumnId = columnId;
    },
  };
}

export type GridEngine<T> = ReturnType<typeof createGridEngine<T>>;
