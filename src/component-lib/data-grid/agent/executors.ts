/*
 * How a DataGrid performs its operations.
 *
 * Every executor here closes over a `GridApi`, because that is how this
 * particular component is driven. Nothing above this file knows that. Swap in
 * a registry whose executors call a server, or a host's `setState`, and the
 * contract, the schema, the validator and the history all carry on unchanged
 * — which is the whole reason the executor is a separate thing from the
 * operation.
 *
 * `undo` and `redo` are the demonstration: they are real operations with no
 * `GridApi` method behind them at all.
 */

import type { GridApi } from "../core/grid";
import type { PinSide, SortItem } from "../core/types";
import type { ExecutionContext, RegisteredExecutor } from "../../shared/core/agent";
import type { GridRuntimeContract } from "./contract";
import type { GridIntent } from "./intent";
import type { GridOperationName } from "./operations";

export type GridExecutionContext = ExecutionContext<GridRuntimeContract>;

export interface GridExecutorHost {
  undo(): boolean;
  redo(): boolean;
}

type Intent<A extends GridOperationName> = Extract<GridIntent, { action: A }>;

function executor<A extends GridOperationName>(
  operation: A,
  run: (input: Intent<A>, context: GridExecutionContext) => void | Promise<void>,
  apiMethod?: string,
): RegisteredExecutor<GridRuntimeContract> {
  return {
    operation,
    ...(apiMethod ? { apiMethod } : {}),
    execute: run as (input: never, context: GridExecutionContext) => void | Promise<void>,
  };
}

/**
 * The default registry: one executor per operation, each naming the `GridApi`
 * method it calls so an audit trail can record it.
 */
export function createGridExecutors<T>(
  api: GridApi<T>,
  host: GridExecutorHost,
): Map<GridOperationName, RegisteredExecutor<GridRuntimeContract>> {
  const entries: RegisteredExecutor<GridRuntimeContract>[] = [
    executor("search", (intent) => api.setGlobalFilter(intent.text), "setGlobalFilter"),

    executor(
      "filter",
      (intent) =>
        api.setFilter(intent.column, {
          operator: intent.operator,
          ...(intent.value !== undefined ? { value: intent.value } : {}),
          ...(intent.value2 !== undefined ? { value2: intent.value2 } : {}),
        }),
      "setFilter",
    ),

    executor("clearFilters", () => api.clearFilters(), "clearFilters"),

    executor(
      "sort",
      (intent) => {
        const item: SortItem = { columnId: intent.column, desc: intent.direction === "desc" };
        // `setSorting` replaces; appending is a read-modify-write on the
        // current sort, with the same column replaced rather than duplicated.
        if (!intent.append) {
          api.setSorting([item]);
          return;
        }
        const existing = api.getState().sorting.filter((entry) => entry.columnId !== intent.column);
        api.setSorting([...existing, item]);
      },
      "setSorting",
    ),

    executor("clearSort", () => api.setSorting([]), "setSorting"),

    executor(
      "selectRows",
      (intent) => {
        const value = intent.value !== false;
        for (const rowId of intent.rowIds) api.toggleRowSelected(rowId, { value });
      },
      "toggleRowSelected",
    ),

    executor("selectAll", (intent) => api.toggleAllRowsSelected(intent.value !== false), "toggleAllRowsSelected"),
    executor("clearSelection", () => api.clearSelection(), "clearSelection"),

    executor(
      "setColumnVisibility",
      (intent) => api.setColumnVisibility(intent.column, intent.visible),
      "setColumnVisibility",
    ),

    executor(
      "pinColumn",
      (intent) => api.pinColumn(intent.column, (intent.side ?? false) as PinSide | false),
      "pinColumn",
    ),

    executor(
      "moveColumn",
      (intent) => api.moveColumn(intent.column, intent.target, intent.placement),
      "moveColumn",
    ),

    executor("setColumnWidth", (intent) => api.setColumnWidth(intent.column, intent.width), "setColumnWidth"),
    executor("resetColumns", () => api.resetColumns(), "resetColumns"),

    executor("setPage", (intent) => api.setPageIndex(intent.index), "setPageIndex"),
    executor("setPageSize", (intent) => api.setPageSize(intent.size), "setPageSize"),
    executor("setDensity", (intent) => api.setDensity(intent.density), "setDensity"),

    // One operation, three methods — so no single `apiMethod` is recorded.
    executor("export", (intent) => {
      const options = {
        scope: intent.scope ?? ("filtered" as const),
        ...(intent.fileName ? { fileName: intent.fileName } : {}),
      };
      if (intent.format === "csv") return api.exportCsv(options);
      if (intent.format === "excel") return api.exportExcel(options);
      return api.exportPdf(options);
    }),

    executor(
      "print",
      (intent) =>
        api.print({
          scope: intent.scope ?? "filtered",
          ...(intent.title ? { title: intent.title } : {}),
        }),
      "print",
    ),

    executor("copy", () => api.copyToClipboard(), "copyToClipboard"),

    // Performed by the agent's history. Proof that `apiMethod` is optional.
    executor("undo", () => {
      host.undo();
    }),
    executor("redo", () => {
      host.redo();
    }),
  ];

  return new Map(entries.map((entry) => [entry.operation as GridOperationName, entry]));
}
