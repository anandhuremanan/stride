/*
 * The DataGrid's WebMCP tool.
 *
 * All of the mechanism lives in `shared/core/agent/webmcp`. What belongs here
 * is only what is true of a grid: the tool's name, how to describe this grid
 * to an agent in words, and which numbers a successful call should report.
 *
 * Framework-free, like the rest of `agent/` — no React import, so a host can
 * register the tool from an effect, a router, or not at all.
 */

import {
  registerAgentTool,
  type ModelContext,
  type RegistrationResult,
  type ToolCallLog,
} from "../../shared/core/agent/webmcp";
import type { GridAgent } from "./engine";

/*
 * Re-exported so a host that only imports from `data-grid` has every type that
 * appears in this module's options and results.
 */
export type {
  ModelContext,
  RegistrationResult,
  ToolCallLog,
  ToolResultPayload,
} from "../../shared/core/agent/webmcp";

export const GRID_TOOL_NAME = "operate_grid";

export interface RegisterGridToolOptions {
  /** Override the tool name when a page carries more than one grid. */
  name?: string;
  /** Observe every call, for a UI log or a test. */
  onCall?: (entry: ToolCallLog) => void;
  /** Where to register. Defaults to `document.modelContext`. */
  modelContext?: ModelContext;
  /** How many operations an agent may send in one call. Default 8. */
  maxIntents?: number;
}

/**
 * How the grid introduces itself to an agent.
 *
 * Built from the live contract rather than written once, so a grid with
 * different columns advertises different columns. Policy-restricted fields are
 * absent from the generated schema entirely, so they are not listed here
 * either — an agent should not be told about a column it cannot address.
 */
function describeGrid(agent: GridAgent<unknown>): string {
  const contract = agent.contract();
  const columns = contract.columns
    .filter((column) => column.filterable || column.sortable)
    .map((column) => column.id)
    .join(", ");

  return [
    "Filter, sort, search, paginate, select rows in, or export the data grid on this page.",
    `Columns: ${columns}.`,
    `Operations: ${contract.operations.join(", ")}.`,
    'Values may be written as a person would — "1 lakh", "20%", "last month" — and are',
    "converted exactly. Every call is validated before anything happens; an invalid request",
    "is refused with a reason rather than approximated.",
  ].join(" ");
}

/**
 * Registers `operate_grid` against the browser's WebMCP surface.
 *
 * Returns rather than throws when WebMCP is absent, because that is the normal
 * case in most browsers today: the caller shows the grid regardless and the
 * agent affordance is simply not there.
 *
 * ```ts
 * const agent = createGridAgent({ api: apiRef.current, options });
 * const result = registerGridTool(agent);
 * if (!result.registered) console.info(result.reason);
 * ```
 *
 * One tool per page: WebMCP throws on a duplicate name, and React's
 * StrictMode runs effects twice in development, so guard the call with a ref
 * or register outside the render path.
 */
export function registerGridTool(
  agent: GridAgent<unknown>,
  options: RegisterGridToolOptions = {},
): RegistrationResult {
  return registerAgentTool(agent, {
    name: options.name ?? GRID_TOOL_NAME,
    describe: describeGrid,
    maxIntents: options.maxIntents,
    intentsDescription:
      "Operations to apply in order. Several filters on different columns combine with AND.",
    summarise: (current) => {
      const contract = current.contract();
      return {
        rowsShowing: contract.stats.filteredRows,
        rowsTotal: contract.stats.totalRows,
        canUndo: contract.state.canUndo,
      };
    },
    onCall: options.onCall,
    modelContext: options.modelContext,
  });
}
