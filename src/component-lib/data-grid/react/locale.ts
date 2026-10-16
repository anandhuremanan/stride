import type { FilterOperator } from "../core/types";

export interface LocaleText {
  gridLabel: string;
  search: string;
  searchPlaceholder: string;
  columns: string;
  resetColumns: string;
  export: string;
  exportCsv: string;
  exportExcel: string;
  exportPdf: string;
  print: string;
  density: string;
  densityCompact: string;
  densityStandard: string;
  densityComfortable: string;
  selected(count: string): string;
  clearSelection: string;
  clearFilters: string;
  removeFilter(label: string): string;
  filtered: string;
  noRows: string;
  noResults: string;
  loading: string;
  pagination: string;
  rowsPerPage: string;
  pageRange(from: string, to: string, total: string): string;
  page: string;
  pageOf(total: string): string;
  firstPage: string;
  previousPage: string;
  nextPage: string;
  lastPage: string;
  columnMenu(header: string): string;
  sortAscending: string;
  sortDescending: string;
  clearSort: string;
  pinLeft: string;
  pinRight: string;
  unpin: string;
  hideColumn: string;
  moveLeft: string;
  moveRight: string;
  filter: string;
  filterValue: string;
  filterFrom: string;
  filterTo: string;
  filterOperator: string;
  applyFilter: string;
  clearFilter: string;
  operators: Record<FilterOperator, string>;
  yes: string;
  no: string;
  selectRow: string;
  selectAllRows: string;
}

export const defaultLocaleText: LocaleText = {
  gridLabel: "Data grid",
  search: "Search",
  searchPlaceholder: "Search…",
  columns: "Columns",
  resetColumns: "Reset columns",
  export: "Export",
  exportCsv: "CSV",
  exportExcel: "Excel (.xlsx)",
  exportPdf: "PDF (.pdf)",
  print: "Print…",
  density: "Density",
  densityCompact: "Compact",
  densityStandard: "Standard",
  densityComfortable: "Comfortable",
  selected: (count) => `${count} selected`,
  clearSelection: "Clear",
  clearFilters: "Clear all",
  removeFilter: (label) => `Remove filter: ${label}`,
  filtered: "Filtered",
  noRows: "No rows",
  noResults: "No rows match the current filters",
  loading: "Loading…",
  pagination: "Pagination",
  rowsPerPage: "Rows per page",
  pageRange: (from, to, total) => `${from}–${to} of ${total}`,
  page: "Page",
  pageOf: (total) => `of ${total}`,
  firstPage: "First page",
  previousPage: "Previous page",
  nextPage: "Next page",
  lastPage: "Last page",
  columnMenu: (header) => `${header} column options`,
  sortAscending: "Sort ascending",
  sortDescending: "Sort descending",
  clearSort: "Clear sort",
  pinLeft: "Pin to start",
  pinRight: "Pin to end",
  unpin: "Unpin",
  hideColumn: "Hide column",
  moveLeft: "Move earlier",
  moveRight: "Move later",
  filter: "Filter",
  filterValue: "Value",
  filterFrom: "From",
  filterTo: "To",
  filterOperator: "Condition",
  applyFilter: "Apply",
  clearFilter: "Clear",
  operators: {
    contains: "contains",
    notContains: "does not contain",
    equals: "is",
    notEquals: "is not",
    startsWith: "starts with",
    endsWith: "ends with",
    gt: ">",
    gte: "≥",
    lt: "<",
    lte: "≤",
    between: "between",
    before: "before",
    after: "after",
    in: "is any of",
    isEmpty: "is empty",
    isNotEmpty: "is not empty",
  },
  yes: "Yes",
  no: "No",
  selectRow: "Select row",
  selectAllRows: "Select all rows",
};
