import { createContext, useContext } from "react";
import { FunctionRegistry, SurfaceManager } from "../core";
import type {
  A2UIActionPayload,
  A2UIClientErrorPayload,
  A2UIDiagnostic,
  A2UIHostEffect
} from "../core";
import type {
  ComponentsMap,
  UnknownComponentFallback
} from "./types";

export interface RuntimeContextValue {
  manager: SurfaceManager;
  functionRegistry: FunctionRegistry;
  componentsMap: ComponentsMap;
  onAction?: (payload: A2UIActionPayload) => void;
  onClientError?: (payload: A2UIClientErrorPayload) => void;
  onWarning?: (diagnostic: A2UIDiagnostic) => void;
  onHostEffect?: (effect: A2UIHostEffect) => void;
  unknownComponentFallback?: UnknownComponentFallback;
}

export interface SurfaceContextValue {
  surfaceId: string;
  scopePath: string;
}

export const RuntimeContext = createContext<RuntimeContextValue | null>(null);
export const SurfaceContext = createContext<SurfaceContextValue | null>(null);

export function useRuntimeContext(): RuntimeContextValue {
  const context = useContext(RuntimeContext);
  if (!context) {
    throw new Error("A2UIProvider is required.");
  }
  return context;
}

export function useSurfaceContext(): SurfaceContextValue {
  const context = useContext(SurfaceContext);
  if (!context) {
    throw new Error("A2UIRenderer is required for surface-bound hooks.");
  }
  return context;
}
