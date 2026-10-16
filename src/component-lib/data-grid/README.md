# DataGrid

A virtualized data grid for React 19 with no runtime dependencies besides React.
Works in Vite/SPA apps and in the Next.js App Router.

- **Fast by design:** rows and columns are virtualized; state lives in an
  external store with per-row subscriptions, so selecting a row or moving focus
  re-renders only the rows involved; column resizing rewrites CSS variables
  without rendering; filtering and sorting run at low priority via
  `useDeferredValue`.
- **Features:** typed columns, multi-column sort, typed column filters, global
  search, pagination, row selection (single, multiple, shift-range), column
  resize / reorder (drag or menu) / pin / hide, inline editing with validation and
  async saves, CSV / Excel / PDF export, clipboard copy, density, i18n, RTL, dark
  mode, WAI-ARIA grid keyboard navigation.
- **Client or server mode:** let the grid sort/filter/paginate, or receive a
  query and fetch pages yourself.

## Setup

Import the stylesheet once (e.g. in your root CSS or layout):

```css
@import "../component-lib/data-grid/styles.css";
```

or from JS: `import "component-lib/data-grid/styles.css";`

## Basic usage

```tsx
import { createColumnHelper, DataGrid } from "component-lib/data-grid";

interface Employee { id: number; name: string; salary: number; startDate: string; active: boolean }

const col = createColumnHelper<Employee>();

// Define columns outside the component (or memoize them).
const columns = [
  col.field("id", { header: "ID", type: "number", width: 80, pin: "left" }),
  col.field("name", { width: 200 }),
  col.field("salary", { type: "number", format: (v) => `$${v.toLocaleString()}` }),
  col.field("startDate", { type: "date" }),
  col.field("active", { type: "boolean" }),
];

export function Employees({ data }: { data: Employee[] }) {
  return <DataGrid data={data} columns={columns} getRowId="id" enableRowSelection height={600} />;
}
```

`createColumnHelper` infers the value type for `cell`, `format`, `validate` and
`sortFn`. Plain `ColumnDef<T>[]` objects work too.

### Stable inputs

The grid memoizes on the identity of `data`, `columns` and `getRowId`. Keep
them stable: define columns at module level or with `useMemo`, and pass
`getRowId` as a property name (`getRowId="id"`). With React Compiler enabled,
inline values are memoized for you.

## Columns

| Option | Purpose |
| --- | --- |
| `field` / `accessor` / `id` | Where the value comes from. Display-only columns need just `id` and `cell`. |
| `header`, `width`, `minWidth`, `maxWidth`, `align` | Presentation. |
| `type` | `string` (default), `number`, `date`, `boolean`. Drives filter operators, sorting, alignment, editors and Excel cell types. |
| `options` | `{ label, value }[]` for enum columns: "is any of" filter, select editor, label display. |
| `format(value, row)` | Display text. Also used by search, CSV, PDF and copy. |
| `cell(ctx)` | Custom renderer. Clicks on buttons/inputs inside cells don't trigger `onRowClick`. |
| `pin`, `hidden` | Initial pin side / visibility. |
| `sortable`, `filterable`, `resizable`, `reorderable`, `pinnable`, `hideable`, `searchable` | Per-column feature switches (default `true`). |
| `sortFn`, `filterFn` | Custom comparison / matching. |
| `editable`, `editor`, `validate` | Inline editing (below). |
| `exportable`, `exportValue(row)` | Export control. |
| `headerClassName`, `cellClassName` | Styling hooks. |

## Server mode

```tsx
const [query, setQuery] = useState<GridQuery>(initialQuery);
const { data, isFetching } = useQuery({ queryKey: ["orders", query], queryFn: () => fetchOrders(query) });

<DataGrid
  mode="server"
  data={data?.rows ?? []}
  rowCount={data?.total ?? 0}
  loading={isFetching}
  columns={columns}
  initialState={initialQuery}
  onQueryChange={setQuery}
/>
```

`onQueryChange` receives `{ sorting, filters, globalFilter, pagination }`
whenever one of them changes. Changing filters, search or sorting resets to the
first page. The previous rows stay visible while `loading`.

The framework-free core (`component-lib/data-grid/core`) exports `filterRows`,
`sortRows` and `paginate`, so a Node or Next.js route handler can apply exactly
the same semantics on the server.

## State

All grid state can be controlled or left internal:

```ts
interface GridState {
  sorting; filters; globalFilter; pagination; rowSelection;
  columnOrder; columnVisibility; columnSizing; columnPinning; density;
}
```

- `initialState` seeds internal state.
- `state` controls any subset of keys; the grid then calls `onStateChange(next, prev)`
  instead of updating those keys itself.
- Example: persist column layout with
  `onStateChange={(s) => save(pick(s, ["columnOrder", "columnSizing", "columnPinning", "columnVisibility"]))}`.

## Editing

```ts
col.field("salary", {
  type: "number",
  editable: (row) => !row.locked,
  validate: (v) => (v < 0 ? "Must be positive" : null),
});

<DataGrid onCellEdit={async ({ rowId, columnId, value }) => { await save(rowId, columnId, value); }} />
```

Start editing with double-click, Enter or F2. Enter commits and moves down,
Tab commits and moves right, and Escape cancels. The grid never mutates `data`:
update it in `onCellEdit`. If `onCellEdit` returns a promise, the cell shows the
pending value until it settles, and a rejection marks the cell invalid.
Custom editors: `editor: (props) => <MyInput value={props.value} onChange={props.onChange} onBlur={() => props.commit()} />`.

## Imperative API

```tsx
const api = useRef<GridApi<Employee>>(null);
<DataGrid ref={api} ... />

api.current?.setFilter("status", { operator: "in", value: ["active"] });
api.current?.exportExcel({ scope: "selected", fileName: "people" });
api.current?.focusCell(0, "name");
```

Methods include `toggleSort`, `setSorting`, `setFilter`, `clearFilters`,
`setGlobalFilter`, `setPageIndex`, `setPageSize`, `toggleRowSelected`,
`toggleAllRowsSelected`, `getSelectedRows`, `setColumnVisibility`,
`setColumnWidth`, `pinColumn`, `moveColumn`, `resetColumns`, `scrollToRow`,
`focusCell`, `startEditing`, `getRows`, `exportCsv`, `exportExcel`, `exportPdf`,
`print` and `copyToClipboard`.

## Export

Export code is split into chunks loaded on first use.

| Format | Notes |
| --- | --- |
| CSV | UTF-8 with BOM (opens correctly in Excel). Cells starting with `= + - @` are prefixed with `'` to prevent formula injection. |
| Excel | Real `.xlsx`: typed numbers, booleans and dates, bold frozen header, auto-filter, column widths. Written without a library. |
| PDF | Writes a real `.pdf` and downloads it: chosen paper size and orientation, a repeated header row, page numbers and your own header/footer bands. Uses the standard PDF fonts, so text must be Latin-1. |
| Print | `api.print()` opens the browser's print dialog instead, for paper or for text the standard fonts cannot encode. |

Scopes: `filtered` (default), `all`, `selected`, `page`, or pass `rows`, e.g. a
full result set fetched from the server.

## Keyboard

| Keys | Action |
| --- | --- |
| Arrows, Home/End, Ctrl+Home/End, PageUp/PageDown | Move between cells (header row included). |
| Enter (header) | Sort; Shift+Enter adds to the sort. |
| Alt+↓ or the Menu key (header) | Open the column menu. |
| Enter / F2 | Edit the cell, or focus the widget inside a custom cell. |
| Space | Toggle row selection (Shift for a range). |
| Ctrl/Cmd+A | Select all rows. |
| Ctrl/Cmd+C | Copy selected rows (TSV) or the active cell. |
| Escape | Cancel editing / leave a widget inside a cell. |

## Theming

Styles live in `@layer components`, so Tailwind utilities passed via
`classNames` / `className` win. Override the `--dg-*` variables for a theme:

```css
.dg-root { --dg-accent: #7c3aed; --dg-radius: 12px; --dg-font-size: 14px; }
```

Colors follow the page's `color-scheme`. A `.dark` or `[data-theme="dark"]`
ancestor forces a scheme. State is exposed as attributes for styling:
`data-selected`, `data-active`, `data-editing`, `data-pinned`, `data-density`,
and `aria-sort` on header cells.

Slots for `classNames`: `root`, `toolbar`, `viewport`, `header`, `headerCell`,
`row`, `cell`, `pagination`.

## Next.js

Components carry `"use client"`; import `DataGrid` from a Server Component and
pass serializable props (`data`, `initialState`). Column definitions contain
functions, so define them in a client module. For server mode, fetch in a
Server Component or Route Handler using `core` functions, and sync the query to
the URL (e.g. with `nuqs`) through `state` + `onQueryChange`.

## Known limits

- Rows have a fixed height (per density or `rowHeight`); variable-height rows are not supported.
- Updates from the grid's store render synchronously; heavy client-side filtering is
  deferred with `useDeferredValue`, but a single filter pass over very large data
  (1M+ rows) still runs on the main thread. For that scale, use server mode or a worker.
- Row grouping, tree data and pivoting are not implemented.

## Migrating from `component-lib/datagrid`

| Old prop | New |
| --- | --- |
| `dataSource` (array) | `data` |
| `dataSource` (URL string) | Fetch in your app; pass `data` (the grid no longer fetches). |
| `lazy` + `pageSettings.totalCount` | `mode="server"` + `rowCount` |
| `pageSettings.pageNumber` / `pageSize` | `initialState={{ pagination: { pageIndex: 0, pageSize } }}` |
| `enableSearch`, `enableExcelExport`, `enablePdfExport` | `toolbar={{ search, export }}` |
| `selectAll`, `onSelectRow` | `enableRowSelection`, `onStateChange` / `api.getSelectedRows()` |
| `rowChange` / `onRowClick` | `onRowClick` |
| `pageStatus` / `onPageChange`, `onFilterChange`, `onSearchChange` | `onQueryChange` |
| `initialFilters`, `initialSearchParam` | `initialState={{ filters, globalFilter }}` |
| `isFetching` | `loading` |
| `column.headerText`, `column.template` | `header`, `cell` |
| `grid*Class` props | `classNames` slots |
| `ref.goToPage(n)` etc. | `ref.setPageIndex(n)` and the API above |
