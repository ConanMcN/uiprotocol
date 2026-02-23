export type A2UIProtocolVersion = "v0.9";

export interface A2UITheme {
  primaryColor?: string;
  [key: string]: unknown;
}

export interface A2UIComponent {
  id: string;
  component: string;
  child?: string;
  children?: string[];
  checks?: import("@uiprotocol/core").FunctionCall[];
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
