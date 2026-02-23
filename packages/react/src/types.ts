import type { ComponentType, ReactNode } from "react";
import type {
  Action,
  ActionPayload,
  ApplyResult,
  ClientError,
  Command,
  Diagnostic,
  DynamicValue,
  FunctionCall,
  HostEffect,
  ParseResult,
  Surface,
  TrustConfig,
  UINode
} from "@uiprotocol/core";

export interface ActionDispatchOptions {
  nodeId?: string;
  checks?: FunctionCall[];
  pattern?: string;
  value?: unknown;
}

export interface AdapterProps {
  node: UINode;
  surface: Surface;
  dataModel: unknown;
  scopePath: string;
  childIds: string[];
  renderedChildren: ReactNode[];
  renderChild: (childId: string, key?: string | number, scopePath?: string) => ReactNode;
  resolve: <T>(value: DynamicValue<T> | T) => T | undefined;
  setData: (path: string, value?: unknown, options?: { omitValue?: boolean }) => void;
  dispatchAction: (action: Action, options?: ActionDispatchOptions) => boolean;
}

export type ComponentsMap = Record<string, ComponentType<AdapterProps>>;

export type UnknownComponentFallback = (params: {
  node: UINode;
  surfaceId: string;
}) => ReactNode;

export interface RuntimeProviderProps {
  children: ReactNode;
  componentsMap: ComponentsMap;
  trustPolicy?: TrustConfig;
  onAction?: (payload: ActionPayload) => void;
  onClientError?: (payload: ClientError) => void;
  onWarning?: (diagnostic: Diagnostic) => void;
  onHostEffect?: (effect: HostEffect) => void;
  unknownComponentFallback?: UnknownComponentFallback;
}

export interface ProcessCommandsResult {
  parseResult: ParseResult<Command[]>;
  applyResult?: ApplyResult;
}
