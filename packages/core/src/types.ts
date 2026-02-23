// ── Surface & Nodes ──

export interface Surface {
  id: string;
  protocol: string;
  catalogId?: string;
  theme?: Record<string, unknown>;
  nodes: Map<string, UINode>;
  dataModel: unknown;
  metadata?: Record<string, unknown>;
}

export interface UINode {
  id: string;
  type: string;
  children?: string[];
  checks?: FunctionCall[];
  props: Record<string, unknown>;
}

// ── Dynamic Values ──

export interface BoundValue {
  path: string;
}

export interface FunctionCall {
  call: string;
  args?: Record<string, unknown>;
}

export type DynamicValue<T> = T | BoundValue | FunctionCall;

// ── Commands ──

export type Command =
  | SurfaceCreateCommand
  | SurfaceDeleteCommand
  | NodesUpsertCommand
  | NodesRemoveCommand
  | DataSetCommand
  | DataRemoveCommand;

export interface SurfaceCreateCommand {
  type: "surface:create";
  surfaceId: string;
  timestamp: number;
  protocol: string;
  catalogId?: string;
  theme?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface SurfaceDeleteCommand {
  type: "surface:delete";
  surfaceId: string;
  timestamp: number;
}

export interface NodesUpsertCommand {
  type: "nodes:upsert";
  surfaceId: string;
  timestamp: number;
  nodes: Array<Partial<UINode> & Pick<UINode, "id">>;
}

export interface NodesRemoveCommand {
  type: "nodes:remove";
  surfaceId: string;
  timestamp: number;
  nodeIds: string[];
}

export interface DataSetCommand {
  type: "data:set";
  surfaceId: string;
  timestamp: number;
  path: string;
  value: unknown;
}

export interface DataRemoveCommand {
  type: "data:remove";
  surfaceId: string;
  timestamp: number;
  path: string;
}

// ── Trust ──

export interface TrustConfig {
  agents?: Record<string, AgentPermissions>;
  requireConsent?: string[];
  defaultPolicy?: "allow" | "deny";
}

export interface AgentPermissions {
  allow?: string[];
  deny?: string[];
  maxSurfaces?: number;
}

export type TrustVerdict =
  | { allowed: true }
  | { allowed: false; reason: string };

// ── Diagnostics ──

export interface Diagnostic {
  code: string;
  message: string;
  severity: "warning" | "error";
  surfaceId?: string;
  nodeId?: string;
  path?: string;
  details?: Record<string, unknown>;
}

export type ParseResult<T> =
  | { ok: true; value: T; warnings: Diagnostic[] }
  | { ok: false; errors: Diagnostic[]; warnings: Diagnostic[] };

export interface ApplyResult {
  ok: boolean;
  diagnostics: Diagnostic[];
}

// ── Actions & Effects ──

export interface Action {
  event: string;
  context?: Record<string, unknown>;
  openUrl?: string;
}

export interface HostEffect {
  type: "openUrl";
  surfaceId: string;
  nodeId?: string;
  url: string;
  action: Action;
}

export interface ActionPayload {
  surfaceId: string;
  nodeId?: string;
  action: Action;
  dataModel: unknown;
}

export interface ClientError {
  code: string;
  message: string;
  surfaceId?: string;
  nodeId?: string;
  path?: string;
  details?: Record<string, unknown>;
}

export interface ValidationResult {
  ok: boolean;
  errors: ClientError[];
}

export interface ValidateValueOptions {
  value: unknown;
  checks?: FunctionCall[];
  pattern?: string;
  dataModel: unknown;
  scopePath?: string;
}

// ── Protocol Adapter ──

export interface ProtocolAdapter {
  readonly protocol: string;
  parse(raw: unknown): ParseResult<Command[]>;
}

// ── Events ──

export type RuntimeEventType =
  | "command"
  | "command:before"
  | "trust:blocked"
  | "error"
  | "warning";

// ── Child Refs ──

export type ChildRefCollector = (node: UINode) => string[];
