export type A2UIProtocolVersion = "v0.9";

export interface A2UITheme {
  primaryColor?: string;
  [key: string]: unknown;
}

export interface BoundValue {
  path: string;
}

export interface FunctionCall {
  call: string;
  args?: Record<string, unknown>;
}

export type DynamicValue<T> = T | BoundValue | FunctionCall;

export interface A2UIAction {
  event: string;
  context?: Record<string, unknown>;
  openUrl?: string;
}

export interface A2UIComponent {
  id: string;
  component: string;
  child?: string;
  children?: string[];
  checks?: FunctionCall[];
  [key: string]: unknown;
}

export interface CreateSurfacePayload {
  surfaceId: string;
  catalogId?: string;
  theme?: A2UITheme;
}

export interface UpdateComponentsPayload {
  surfaceId: string;
  components: Array<Partial<A2UIComponent> & Pick<A2UIComponent, "id">>;
}

export interface UpdateDataModelPayload {
  surfaceId: string;
  path?: string;
  value?: unknown;
}

export interface DeleteSurfacePayload {
  surfaceId: string;
}

export interface CreateSurfaceMessage {
  version: A2UIProtocolVersion;
  createSurface: CreateSurfacePayload;
}

export interface UpdateComponentsMessage {
  version: A2UIProtocolVersion;
  updateComponents: UpdateComponentsPayload;
}

export interface UpdateDataModelMessage {
  version: A2UIProtocolVersion;
  updateDataModel: UpdateDataModelPayload;
}

export interface DeleteSurfaceMessage {
  version: A2UIProtocolVersion;
  deleteSurface: DeleteSurfacePayload;
}

export type A2UIMessage =
  | CreateSurfaceMessage
  | UpdateComponentsMessage
  | UpdateDataModelMessage
  | DeleteSurfaceMessage;

export type A2UIMessageType =
  | "createSurface"
  | "updateComponents"
  | "updateDataModel"
  | "deleteSurface";

export type A2UIDiagnosticSeverity = "warning" | "error";

export interface A2UIDiagnostic {
  code: string;
  message: string;
  severity: A2UIDiagnosticSeverity;
  surfaceId?: string;
  componentId?: string;
  path?: string;
  details?: Record<string, unknown>;
}

export type ParseResult<T> =
  | {
      ok: true;
      value: T;
      warnings: A2UIDiagnostic[];
    }
  | {
      ok: false;
      errors: A2UIDiagnostic[];
      warnings: A2UIDiagnostic[];
    };

export interface A2UISurface {
  id: string;
  catalogId?: string;
  theme?: A2UITheme;
  components: Map<string, A2UIComponent>;
  dataModel: unknown;
}

export interface ApplyResult {
  ok: boolean;
  diagnostics: A2UIDiagnostic[];
}

export interface A2UIHostEffect {
  type: "openUrl";
  surfaceId: string;
  componentId?: string;
  url: string;
  action: A2UIAction;
}

export interface A2UIActionPayload {
  surfaceId: string;
  componentId?: string;
  action: A2UIAction;
  dataModel: unknown;
}

export interface A2UIClientErrorPayload {
  code: string;
  message: string;
  surfaceId?: string;
  componentId?: string;
  path?: string;
  details?: Record<string, unknown>;
}

export interface ValidationResult {
  ok: boolean;
  errors: A2UIClientErrorPayload[];
}

export interface ValidateValueOptions {
  value: unknown;
  checks?: FunctionCall[];
  pattern?: string;
  dataModel: unknown;
  scopePath?: string;
}
