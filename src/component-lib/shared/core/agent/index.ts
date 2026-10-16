/*
 * The component-agnostic half of the agent runtime. Nothing here knows about
 * a grid, a date picker, or React.
 */

export type {
  ConfirmRequest,
  ExecutionContext,
  ExecutorRegistry,
  JsonSchema,
  JsonSchemaType,
  OperationDefinition,
  OperationExecutor,
  RegisteredExecutor,
  ValidationIssue,
  ValidationLayer,
  ValidationResult,
} from "./types";
export { fail, ok } from "./types";
export { checkSchema, type SchemaIssue } from "./schema";
export {
  createSnapshotHistory,
  type SnapshotEntry,
  type SnapshotHistory,
  type SnapshotHistoryOptions,
} from "./history";
export { parseQuantity, type ParseQuantityOptions, type Quantity } from "./numbers";
export {
  buildToolInputSchema,
  registerAgentTool,
  webmcpAvailable,
  type ModelContext,
  type ProjectableAgent,
  type ProjectedCommand,
  type ProjectedOutcome,
  type RegisterAgentToolOptions,
  type RegistrationResult,
  type ToolCallLog,
  type ToolResultPayload,
} from "./webmcp";
export type {
  AgentAdapter,
  AgentProposalRequest,
  AskOutcome,
  AskPhase,
} from "./adapter";
