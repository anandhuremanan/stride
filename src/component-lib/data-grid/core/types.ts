import type { MouseEvent, ReactNode } from "react";

export type RowId = string;

export type ColumnType = "string" | "number" | "date" | "boolean";

export type Density = "compact" | "standard" | "comfortable";

export type PinSide = "left" | "right";

export interface SortItem {
  columnId: string;
  desc: boolean;
}

export type FilterOperator =
  | "contains"
  | "notContains"
  | "equals"
  | "notEquals"
  | "startsWith"
  | "endsWith"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "between"
  | "before"
  | "after"
  | "in"
  | "isEmpty"
  | "isNotEmpty";

export type FilterValue =
  | string
  | number
  | boolean
  | ReadonlyArray<string | number>
  | null;

export interface ColumnFilter {
  columnId: string;
  operator: FilterOperator;
  value?: FilterValue;
  /** Upper bound for the `between` operator. */
  value2?: FilterValue;
}

export interface PaginationState {
  pageIndex: number;
  pageSize: number;
}

export interface ColumnPinningState {
  left: string[];
  right: string[];
}

/** Every piece of grid state that can be controlled from the outside. */
export interface GridState {
  sorting: SortItem[];
  filters: ColumnFilter[];
  globalFilter: string;
  pagination: PaginationState;
  rowSelection: Record<RowId, boolean>;
  columnOrder: string[];
  columnVisibility: Record<string, boolean>;
  columnSizing: Record<string, number>;
  columnPinning: ColumnPinningState;
  density: Density;
}

/** The subset of state a server needs to produce a page of rows. */
export interface GridQuery {
  sorting: SortItem[];
  filters: ColumnFilter[];
  globalFilter: string;
  pagination: PaginationState;
}

export interface GridRow<T> {
  id: RowId;
  /** Position in the original `data` array. */
  index: number;
  original: T;
}

export interface CellContext<T, V = unknown> {
  row: T;
  rowId: RowId;
  /** Index within the rows currently displayed (the page). */
  rowIndex: number;
  value: V;
  column: ResolvedColumn<T>;
}

export interface EditorProps<T, V = unknown> {
  value: V;
  row: T;
  column: ResolvedColumn<T>;
  error: string | null;
  onChange(value: V): void;
  /** Commits the current draft, or `value` when given. */
  commit(value?: V): void;
  cancel(): void;
}

export type BuiltInEditor = "text" | "number" | "date" | "select" | "checkbox";

export interface ColumnOption {
  label: string;
  value: string | number;
}

export type ExportCellValue = string | number | boolean | Date | null | undefined;

/**
 * Column definition. Callbacks use method syntax so a `ColumnDef<T, number>`
 * is assignable to `ColumnDef<T>`.
 */
export interface ColumnDef<T, V = unknown> {
  /** Unique id. Defaults to `field`. Required for accessor and display columns. */
  id?: string;
  field?: Extract<keyof T, string>;
  accessor?(row: T): V;
  header?: string;
  type?: ColumnType;
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  align?: "start" | "center" | "end";
  /** Initial pin side. */
  pin?: PinSide;
  /** Initially hidden. */
  hidden?: boolean;
  sortable?: boolean;
  filterable?: boolean;
  resizable?: boolean;
  hideable?: boolean;
  reorderable?: boolean;
  pinnable?: boolean;
  /** Included in the global search. Default true for data columns. */
  searchable?: boolean;
  /** Fixed choices: enables the `in` filter and the select editor. */
  options?: ReadonlyArray<ColumnOption>;
  /** Display text for the value; also used by search, CSV, PDF and copy. */
  format?(value: V, row: T): string;
  /** Custom cell renderer. */
  cell?(ctx: CellContext<T, V>): ReactNode;
  sortFn?(a: V, b: V, rowA: T, rowB: T): number;
  filterFn?(value: V, filter: ColumnFilter, row: T): boolean;
  editable?: boolean | ((row: T) => boolean);
  editor?: BuiltInEditor | ((props: EditorProps<T, V>) => ReactNode);
  /** Return an error message to reject an edit. */
  validate?(value: V, row: T): string | null | undefined;
  exportable?: boolean;
  exportValue?(row: T): ExportCellValue;
  headerClassName?: string;
  cellClassName?: string | ((ctx: CellContext<T, V>) => string | undefined);
}

export interface ResolvedColumn<T> {
  id: string;
  def: ColumnDef<T>;
  header: string;
  type: ColumnType;
  /** False for display-only columns (no field or accessor). */
  hasValue: boolean;
  getValue(row: T): unknown;
  width: number;
  minWidth: number;
  maxWidth: number;
  align: "start" | "center" | "end";
  sortable: boolean;
  filterable: boolean;
  resizable: boolean;
  hideable: boolean;
  reorderable: boolean;
  pinnable: boolean;
  searchable: boolean;
  exportable: boolean;
  /** Internal columns (row selection) are never exported or listed in menus. */
  internal: boolean;
}

export interface ColumnLayoutItem<T> {
  column: ResolvedColumn<T>;
  width: number;
  pinned: PinSide | false;
  /** Offset from the start of its section (left, center or right). */
  offset: number;
  /** Position in visual order, 0-based; also the CSS variable index. */
  visibleIndex: number;
  /** Last left-pinned or first right-pinned column (draws the pin shadow). */
  pinEdge: boolean;
  /** Stable style object for cells of this column. */
  style: Record<string, string>;
}

export interface ColumnLayout<T> {
  columns: ColumnLayoutItem<T>[];
  left: ColumnLayoutItem<T>[];
  center: ColumnLayoutItem<T>[];
  right: ColumnLayoutItem<T>[];
  leftWidth: number;
  centerWidth: number;
  rightWidth: number;
  totalWidth: number;
}

export interface CellEditEvent<T> {
  row: T;
  rowId: RowId;
  columnId: string;
  value: unknown;
  previousValue: unknown;
}

export type ExportScope = "filtered" | "all" | "selected" | "page";

export interface ExportOptions<T> {
  fileName?: string;
  scope?: ExportScope;
  /** Export these rows instead of a scope, e.g. a full result set fetched from the server. */
  rows?: readonly T[];
}

export type PdfPaperSize = "A3" | "A4" | "A5" | "letter" | "legal";

/**
 * A repeating page band. Each slot takes plain text with `{title}`, `{page}`,
 * `{pages}`, `{date}` and `{time}` substituted as the page is drawn.
 */
export interface PdfBand {
  left?: string;
  center?: string;
  right?: string;
}

/** Colors for the generated PDF, as `#rgb` or `#rrggbb`. */
export interface PdfTheme {
  text: string;
  /** Header and footer bands. */
  muted: string;
  border: string;
  headerBg: string;
  headerText: string;
  /** Every other body row, or null for no striping. */
  stripe: string | null;
}

export interface PrintExportOptions<T> extends ExportOptions<T> {
  title?: string;
  orientation?: "portrait" | "landscape";
  paperSize?: PdfPaperSize;
}

export interface PdfExportOptions<T> extends PrintExportOptions<T> {
  /** Page margin in points. 72 points to the inch; defaults to 36. */
  margin?: number;
  /** Body text size in points; defaults to 9. */
  fontSize?: number;
  /** Top of every page. Defaults to the title on the left; null removes it. */
  header?: PdfBand | null;
  /** Bottom of every page. Defaults to date and page numbers; null removes it. */
  footer?: PdfBand | null;
  theme?: Partial<PdfTheme>;
}

export interface GridOptions<T> {
  /**
   * The rows to show. One object per row, in whatever shape your data already
   * has — columns reach into it rather than the other way round. In `server`
   * mode this is the current page, not the whole set.
   */
  data: readonly T[];
  /**
   * One definition per column, and the order here is the initial column order.
   * A definition says where a column's value comes from and how to render it;
   * everything else about the grid is driven from these.
   */
  columns: readonly ColumnDef<T>[];
  /**
   * Stable row id: a property name (recommended) or a function.
   * Defaults to `row.id`, falling back to the array index.
   */
  getRowId?: Extract<keyof T, string> | ((row: T, index: number) => RowId);
  /** `client`: the grid sorts, filters and paginates. `server`: `data` is the current page. */
  mode?: "client" | "server";
  /** Total rows on the server (server mode). */
  rowCount?: number;
  /**
   * Drive the grid from outside. Whatever you pass here the grid obeys rather
   * than deciding for itself, so pair it with `onStateChange` or the grid
   * stops responding. Pass only the slices you want to own; the rest stay
   * internal. For a starting point you do not intend to control, use
   * `initialState`.
   */
  state?: Partial<GridState>;
  /**
   * Where the grid starts — a default sort, a page size, hidden columns. Read
   * once on mount and then owned by the grid, so later changes are ignored.
   */
  initialState?: Partial<GridState>;
  /**
   * Every change to sorting, filters, search, pagination, selection, column
   * layout or density, with the state before it for comparison. This is the
   * hook for persisting a user's view.
   */
  onStateChange?(next: GridState, prev: GridState): void;
  /** Fires when sorting, filters, search or pagination change. */
  onQueryChange?(query: GridQuery): void;
  /** Page the rows instead of scrolling the whole set. Default `true`. */
  enablePagination?: boolean;
  /** Let a header click sort the column. Default `true`. */
  enableSorting?: boolean;
  /**
   * Let a shift-click add a column to the sort rather than replacing it.
   * Default `true`, and inert while `enableSorting` is off.
   */
  enableMultiSort?: boolean;
  /** Per-column filters and the toolbar's search box. Default `true`. */
  enableFiltering?: boolean;
  /** Let a header edge be dragged to resize. Default `true`. */
  enableColumnResizing?: boolean;
  /** Let a header be dragged to move the column. Default `true`. */
  enableColumnReordering?: boolean;
  /** Let a column be pinned to the left or right edge. Default `true`. */
  enableColumnPinning?: boolean;
  /** Let columns be shown and hidden from the toolbar. Default `true`. */
  enableColumnHiding?: boolean;
  /**
   * Add the selection column. Default `false`. A function selects per row —
   * return `false` and that row's checkbox is disabled, which is how to stop
   * someone picking a record their role does not cover.
   */
  enableRowSelection?: boolean | ((row: T) => boolean);
  /** `single` leaves one row selected at a time. Default `multiple`. */
  selectionMode?: "single" | "multiple";
  /**
   * A cell was edited. Fires only when the value actually changed.
   *
   * Return a promise to make the edit optimistic: the new value shows while
   * it is in flight, and if the promise rejects the cell reverts to the
   * underlying data and shows the rejection's message as the cell's error.
   * So reject with the reason you want the user to read.
   */
  onCellEdit?(event: CellEditEvent<T>): void | Promise<void>;
  /** Not fired for clicks on interactive content (buttons, inputs, links, checkboxes). */
  onRowClick?(row: T, event: MouseEvent<HTMLElement>): void;
  /** Same exclusions as `onRowClick`: interactive content does not reach it. */
  onRowDoubleClick?(row: T, event: MouseEvent<HTMLElement>): void;
  /** Base name for an exported file, without the extension. */
  exportFileName?: string;
}
