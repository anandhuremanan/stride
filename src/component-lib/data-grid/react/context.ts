"use client";

import { createContext, use } from "react";
import type { GridEngine } from "../core/grid";
import type { RowId } from "../core/types";
import type { Formatters } from "../core/values";
import type { LocaleText } from "./locale";

export type GridSlot =
  | "root"
  | "toolbar"
  | "viewport"
  | "header"
  | "headerCell"
  | "row"
  | "cell"
  | "pagination";

export interface GridFeatures {
  sorting: boolean;
  filtering: boolean;
  resizing: boolean;
  reordering: boolean;
  pinning: boolean;
  hiding: boolean;
  selection: boolean;
  selectionMode: "single" | "multiple";
}

export interface GridContextValue<T> {
  engine: GridEngine<T>;
  locale: LocaleText;
  classNames: Partial<Record<GridSlot, string>>;
  features: GridFeatures;
  formatters: Formatters;
  numberFormat: Intl.NumberFormat;
  /** Set when the parent controls `rowSelection`. */
  controlledSelection: Record<RowId, boolean> | undefined;
  isRowSelectable(row: T): boolean;
  openColumnMenu(columnId: string, anchor: HTMLElement): void;
}

export const GridContext = createContext<GridContextValue<unknown> | null>(null);

export function useGridContext<T>(): GridContextValue<T> {
  const context = use(GridContext);
  if (!context) {
    throw new Error("[DataGrid] Grid parts must be rendered inside <DataGrid>.");
  }
  return context as unknown as GridContextValue<T>;
}

/** Marks a cell without an in-flight async edit. */
export const NO_PENDING: unique symbol = Symbol("dg.noPending");

// Shared with every other component, so class handling cannot drift.
export { cx } from "../../shared/core/cx";
