import type { ComponentType, ReactNode } from "react";
import type {
  A2UIAction,
  A2UIActionPayload,
  A2UIClientErrorPayload,
  A2UIComponent,
  A2UIDiagnostic,
  A2UIHostEffect,
  A2UISurface,
  DynamicValue,
  FunctionCall,
  ParseResult
} from "../core";

export interface ActionDispatchOptions {
  componentId?: string;
  checks?: FunctionCall[];
  pattern?: string;
  value?: unknown;
}

export interface A2UIAdapterProps {
  component: A2UIComponent;
  surface: A2UISurface;
  dataModel: unknown;
  scopePath: string;
  childIds: string[];
  renderedChildren: ReactNode[];
  renderChild: (childId: string, key?: string | number, scopePath?: string) => ReactNode;
  resolve: <T>(value: DynamicValue<T> | T) => T | undefined;
  setData: (path: string, value?: unknown, options?: { omitValue?: boolean }) => void;
  dispatchAction: (action: A2UIAction, options?: ActionDispatchOptions) => boolean;
}

export type ComponentsMap = Record<string, ComponentType<A2UIAdapterProps>>;

export type UnknownComponentFallback = (params: {
  component: A2UIComponent;
  surfaceId: string;
}) => ReactNode;

export interface A2UIProviderProps {
  children: ReactNode;
  componentsMap: ComponentsMap;
  onAction?: (payload: A2UIActionPayload) => void;
  onClientError?: (payload: A2UIClientErrorPayload) => void;
  onWarning?: (diagnostic: A2UIDiagnostic) => void;
  onHostEffect?: (effect: A2UIHostEffect) => void;
  unknownComponentFallback?: UnknownComponentFallback;
}

export interface ProcessMessageResult {
  parseResult: ParseResult<import("../core").A2UIMessage>;
  applyResult?: import("../core").ApplyResult;
}
