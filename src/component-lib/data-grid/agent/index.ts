/*
 * The DataGrid agent runtime.
 *
 * Framework-free: no React import anywhere under `agent/`, so the same code
 * can validate a command on a server before it is ever sent to a browser.
 */

export {
  buildGridContract,
  GRID_CONTRACT_VERSION,
  type BuildContractOptions,
  type GridAgentPolicy,
  type GridCapabilities,
  type GridColumnSemantics,
  type GridColumnStats,
  type GridContractColumn,
  type GridContractState,
  type GridContractStats,
  type GridRuntimeContract,
} from "./contract";

export { createDataset, type GridDataset } from "./dataset";

export {
  GRID_OPERATIONS,
  GRID_OPERATION_NAMES,
  isGridOperation,
  type GridOperationDefinition,
  type GridOperationName,
} from "./operations";

export {
  buildIntentSchema,
  buildResponseSchema,
  COLUMN_REQUIREMENT,
  type GeneratedIntentSchema,
  type GridIntent,
  type GridResponse,
} from "./intent";

export {
  coerceFilter,
  nearest,
  resolveRelativeDate,
  type CoercionNote,
  type CoerceOptions,
  type DateRange,
} from "./coerce";

export {
  projectQuery,
  validateBatch,
  validateIntent,
  type GridCommand,
  type GridExplanation,
  type ValidateContext,
} from "./validate";

export { createGridExecutors, type GridExecutionContext, type GridExecutorHost } from "./executors";

export {
  createGridAgent,
  decodeGridView,
  encodeGridView,
  type GridAgent,
  type GridAgentOptions,
  type GridExecution,
  type GridView,
} from "./engine";

export {
  GRID_TOOL_NAME,
  registerGridTool,
  type ModelContext,
  type RegisterGridToolOptions,
  type RegistrationResult,
  type ToolCallLog,
  type ToolResultPayload,
} from "./webmcp";
