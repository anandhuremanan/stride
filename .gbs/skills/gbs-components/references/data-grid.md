# DataGrid

A virtualized grid. Import `DataGrid` and `createColumnHelper` from
`component-lib/data-grid` and the stylesheet once.

```tsx
import { createColumnHelper, DataGrid } from "component-lib/data-grid";

interface Employee { id: number; name: string; salary: number; active: boolean }

const col = createColumnHelper<Employee>();

// Define columns at module level, or memoize them.
const columns = [
  col.field("id", { header: "ID", type: "number", width: 80, pin: "left" }),
  col.field("name", { width: 200 }),
  col.field("salary", { type: "number", format: (v) => `$${v.toLocaleString()}` }),
  col.field("active", { type: "boolean" }),
];

export function Employees({ data }: { data: Employee[] }) {
  return <DataGrid data={data} columns={columns} getRowId="id" enableRowSelection height={600} />;
}
```

**Keep `data`, `columns` and `getRowId` stable.** The grid memoizes on their
identity. Define columns at module level or in `useMemo`, and pass `getRowId` as
a property name (`getRowId="id"`). With React Compiler on, inline values are
memoized for you.

## Props

From `GridOptions<T>`: `data` (required), `columns` (required), `getRowId`,
`mode` (`client` | `server`), `rowCount` (server mode), `state`, `initialState`,
`onStateChange`, `onQueryChange`, `enableRowSelection`, `enableMultiSort`,
`exportFileName`, and the feature toggles.

From `DataGridProps<T>`: `ref` (`Ref<GridApi<T>>`), `height` (`number | string`,
520; ignored with `autoHeight`), `autoHeight`, `rowHeight` (defaults to the
density: compact 32, standard 40, comfortable 52), `headerHeight`, `loading`,
`toolbar` (`boolean | ToolbarOptions` — search, columns, export, density),
`pageSizeOptions` (`[25, 50, 100, 250]`), `emptyState`, `getRowClassName`,
`locale` (BCP 47), `localeText`, `className`, `classNames`, `style`,
`aria-label`.

Slots: `root`, `toolbar`, `viewport`, `header`, `headerCell`, `row`, `cell`,
`pagination`.

## Columns

| Option | Purpose |
| --- | --- |
| `field` / `accessor` / `id` | Where the value comes from. Display-only columns need just `id` and `cell`. |
| `header`, `width`, `minWidth`, `maxWidth`, `align` | Presentation. |
| `type` | `string` (default), `number`, `date`, `boolean`. Drives filter operators, sorting, alignment, editors, Excel cell types. |
| `options` | `{ label, value }[]` for enum columns: "is any of" filter, select editor, label display. |
| `format(value, row)` | Display text. Also used by search, CSV, PDF and copy. |
| `cell` | Custom renderer. |
| `editable`, `validate` | Inline editing with validation. |
| `pin` | `"left"` or `"right"`. |
| `exportable` | `false` keeps the column out of exports and copy. |

`createColumnHelper<T>()` infers the value type for `cell`, `format`, `validate`
and `sortFn`. Plain `ColumnDef<T>[]` objects also work.

## Imperative API

```tsx
const api = useRef<GridApi<Employee>>(null);
<DataGrid ref={api} … />

api.current?.setFilter("status", { operator: "in", value: ["active"] });
api.current?.exportExcel({ scope: "selected", fileName: "people" });
api.current?.focusCell(0, "name");
```

Methods: `getState`, `setState`, `toggleSort`, `setSorting`, `setFilter`,
`clearFilters`, `setGlobalFilter`, `setPageIndex`, `setPageSize`,
`toggleRowSelected`, `toggleAllRowsSelected`, `clearSelection`,
`getSelectedRowIds`, `getSelectedRows`, `setColumnVisibility`, `setColumnWidth`,
`pinColumn`, `moveColumn`, `resetColumns`, `scrollToRow`, `focusCell`,
`startEditing`, `cancelEditing`, `getRows`, `exportCsv`, `exportExcel`,
`exportPdf`, `print`, `copyToClipboard`.

## Export

Export code is split into chunks loaded on first use. Scopes: `filtered`
(default), `all`, `selected`, `page`, or pass `rows`.

- `exportCsv` — UTF-8 with BOM; cells starting with `= + - @` get a `'` prefix
  against formula injection.
- `exportExcel` — real `.xlsx`: typed numbers, booleans and dates, bold frozen
  header, auto-filter, column widths.
- `exportPdf` — writes a real `.pdf` and downloads it: paper size, orientation,
  repeated header row, page numbers, your own header/footer bands.
- `print` — opens the browser's print dialog instead, for paper or for text the
  PDF's Latin-1 fonts cannot encode.

```tsx
api.current?.exportPdf({
  title: "Q3 headcount",
  orientation: "landscape",
  paperSize: "A4",                 // A3 A4 A5 letter legal
  footer: { left: "Confidential", right: "Page {page} of {pages}" },
});
```

Band tokens: `{title}`, `{page}`, `{pages}`, `{date}`, `{time}`. Also `margin`
(points), `fontSize`, `header`, and `theme` (`text` `muted` `border` `headerBg`
`headerText` `stripe`). PDF text is WinAnsi/Latin-1; other scripts become `?` —
use `print()` for those.

## Server mode

Set `mode="server"`, pass the current page as `data` and the total as
`rowCount`, and fetch in `onQueryChange`.
