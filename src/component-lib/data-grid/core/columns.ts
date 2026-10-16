import type {
  ColumnDef,
  ColumnLayout,
  ColumnLayoutItem,
  ColumnPinningState,
  GridState,
  PinSide,
  ResolvedColumn,
} from "./types";

export const SELECTION_COLUMN_ID = "__select__";

const DEFAULT_WIDTH = 160;
const DEFAULT_MIN_WIDTH = 60;
const DEFAULT_MAX_WIDTH = 1200;

type LayoutState = Pick<
  GridState,
  "columnOrder" | "columnVisibility" | "columnSizing" | "columnPinning"
>;

export function getColumnId<T>(def: ColumnDef<T>): string {
  const id = def.id ?? def.field;
  if (!id) {
    throw new Error("[DataGrid] Every column needs an `id` or a `field`.");
  }
  return id;
}

function humanize(id: string): string {
  const spaced = id
    .replace(/[_-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export function resolveColumns<T>(
  defs: readonly ColumnDef<T>[],
): ResolvedColumn<T>[] {
  const seen = new Set<string>();

  return defs.map((def) => {
    const id = getColumnId(def);
    if (seen.has(id)) {
      throw new Error(`[DataGrid] Duplicate column id "${id}".`);
    }
    seen.add(id);

    const { field, accessor } = def;
    const hasValue = accessor !== undefined || field !== undefined;
    const getValue: (row: T) => unknown = accessor
      ? (row) => accessor(row)
      : field
        ? (row) => row[field]
        : () => undefined;
    const type = def.type ?? "string";
    const minWidth = def.minWidth ?? DEFAULT_MIN_WIDTH;
    const maxWidth = def.maxWidth ?? DEFAULT_MAX_WIDTH;

    return {
      id,
      def,
      header: def.header ?? humanize(id),
      type,
      hasValue,
      getValue,
      width: clamp(def.width ?? DEFAULT_WIDTH, minWidth, maxWidth),
      minWidth,
      maxWidth,
      align:
        def.align ??
        (type === "number" ? "end" : type === "boolean" ? "center" : "start"),
      sortable: hasValue && def.sortable !== false,
      filterable: hasValue && def.filterable !== false,
      resizable: def.resizable !== false,
      hideable: def.hideable !== false,
      reorderable: def.reorderable !== false,
      pinnable: def.pinnable !== false,
      searchable: hasValue && def.searchable !== false,
      exportable:
        (hasValue || def.exportValue !== undefined) && def.exportable !== false,
      internal: false,
    };
  });
}

export function createSelectionColumn<T>(): ResolvedColumn<T> {
  return {
    id: SELECTION_COLUMN_ID,
    def: { id: SELECTION_COLUMN_ID },
    header: "",
    type: "boolean",
    hasValue: false,
    getValue: () => undefined,
    width: 44,
    minWidth: 44,
    maxWidth: 44,
    align: "center",
    sortable: false,
    filterable: false,
    resizable: false,
    hideable: false,
    reorderable: false,
    pinnable: false,
    searchable: false,
    exportable: false,
    internal: true,
  };
}

/** Columns in user order: ids from `order` first, the rest in definition order. */
export function orderColumns<T>(
  columns: readonly ResolvedColumn<T>[],
  order: readonly string[],
): ResolvedColumn<T>[] {
  if (order.length === 0) return [...columns];
  const byId = new Map(columns.map((c) => [c.id, c]));
  const result: ResolvedColumn<T>[] = [];
  const used = new Set<string>();
  for (const id of order) {
    const column = byId.get(id);
    if (column && !used.has(id)) {
      result.push(column);
      used.add(id);
    }
  }
  for (const column of columns) {
    if (!used.has(column.id)) result.push(column);
  }
  return result;
}

export function getColumnWidth<T>(
  column: ResolvedColumn<T>,
  sizing: Record<string, number>,
): number {
  const width = sizing[column.id];
  return width === undefined
    ? column.width
    : clamp(width, column.minWidth, column.maxWidth);
}

export function computeLayout<T>(
  columns: readonly ResolvedColumn<T>[],
  state: LayoutState,
  leading: readonly ResolvedColumn<T>[] = [],
): ColumnLayout<T> {
  const byId = new Map(columns.map((c) => [c.id, c]));
  const isVisible = (c: ResolvedColumn<T> | undefined): c is ResolvedColumn<T> =>
    c !== undefined && state.columnVisibility[c.id] !== false;

  const pinnedIds = new Set([
    ...state.columnPinning.left,
    ...state.columnPinning.right,
  ]);
  const leftColumns = [
    ...leading,
    ...state.columnPinning.left.map((id) => byId.get(id)).filter(isVisible),
  ];
  const rightColumns = state.columnPinning.right
    .map((id) => byId.get(id))
    .filter(isVisible);
  const centerColumns = orderColumns(columns, state.columnOrder).filter(
    (c) => !pinnedIds.has(c.id) && isVisible(c),
  );

  let visibleIndex = 0;
  const build = (
    section: ResolvedColumn<T>[],
    pinned: PinSide | false,
  ): [ColumnLayoutItem<T>[], number] => {
    let offset = 0;
    const items = section.map((column) => {
      const width = getColumnWidth(column, state.columnSizing);
      const index = visibleIndex++;
      const style: Record<string, string> = { width: `var(--dg-c${index}-w)` };
      if (pinned === "left") style.insetInlineStart = `var(--dg-c${index}-o)`;
      if (pinned === "right") style.insetInlineEnd = `var(--dg-c${index}-o)`;
      const item = { column, width, pinned, offset, visibleIndex: index, style, pinEdge: false };
      offset += width;
      return item;
    });
    return [items, offset];
  };

  const [left, leftWidth] = build(leftColumns, "left");
  const [center, centerWidth] = build(centerColumns, false);
  const [right, rightWidth] = build(rightColumns, "right");
  const lastLeft = left.at(-1);
  if (lastLeft) lastLeft.pinEdge = true;
  if (right[0]) right[0].pinEdge = true;

  return {
    columns: [...left, ...center, ...right],
    left,
    center,
    right,
    leftWidth,
    centerWidth,
    rightWidth,
    totalWidth: leftWidth + centerWidth + rightWidth,
  };
}

/**
 * CSS custom properties that size and position every column. Resizing only
 * rewrites these variables, so cells never re-render during a drag.
 */
export function getLayoutVars<T>(
  layout: ColumnLayout<T>,
  overrides?: Record<string, number>,
): Record<string, string> {
  const widthOf = (item: ColumnLayoutItem<T>) =>
    overrides?.[item.column.id] ?? item.width;
  const vars: Record<string, string> = {};
  let total = 0;

  let leftOffset = 0;
  for (const item of layout.left) {
    const width = widthOf(item);
    vars[`--dg-c${item.visibleIndex}-w`] = `${width}px`;
    vars[`--dg-c${item.visibleIndex}-o`] = `${leftOffset}px`;
    leftOffset += width;
  }
  for (const item of layout.center) {
    vars[`--dg-c${item.visibleIndex}-w`] = `${widthOf(item)}px`;
    total += widthOf(item);
  }
  let rightOffset = 0;
  for (let i = layout.right.length - 1; i >= 0; i--) {
    const item = layout.right[i];
    const width = widthOf(item);
    vars[`--dg-c${item.visibleIndex}-w`] = `${width}px`;
    vars[`--dg-c${item.visibleIndex}-o`] = `${rightOffset}px`;
    rightOffset += width;
  }

  total += leftOffset + rightOffset;
  vars["--dg-total-width"] = `${total}px`;
  return vars;
}

export function pinColumn(
  pinning: ColumnPinningState,
  columnId: string,
  side: PinSide | false,
): ColumnPinningState {
  const left = pinning.left.filter((id) => id !== columnId);
  const right = pinning.right.filter((id) => id !== columnId);
  if (side === "left") left.push(columnId);
  if (side === "right") right.unshift(columnId);
  return { left, right };
}

/** Moves a column next to another one, adopting the target's pin section. */
export function moveColumn<T>(
  columns: readonly ResolvedColumn<T>[],
  state: Pick<GridState, "columnOrder" | "columnPinning">,
  columnId: string,
  targetId: string,
  placement: "before" | "after",
): Pick<GridState, "columnOrder" | "columnPinning"> {
  if (columnId === targetId) return state;

  const insert = (ids: string[]) => {
    const next = ids.filter((id) => id !== columnId);
    const targetIndex = next.indexOf(targetId);
    if (targetIndex === -1) return next;
    next.splice(placement === "before" ? targetIndex : targetIndex + 1, 0, columnId);
    return next;
  };

  const { left, right } = state.columnPinning;
  const stripped = pinColumn(state.columnPinning, columnId, false);

  if (left.includes(targetId)) {
    return { ...state, columnPinning: { ...stripped, left: insert(stripped.left) } };
  }
  if (right.includes(targetId)) {
    return { ...state, columnPinning: { ...stripped, right: insert(stripped.right) } };
  }
  const order = orderColumns(columns, state.columnOrder).map((c) => c.id);
  return { columnOrder: insert(order), columnPinning: stripped };
}
