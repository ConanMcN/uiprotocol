import { createContext, useContext } from "react";
import type {
  Runtime,
  ActionPayload,
  ClientError,
  Diagnostic,
  HostEffect
} from "@uiprotocol/core";
import type { ComponentsMap, UnknownComponentFallback } from "./types";

export interface RuntimeContextValue {
  runtime: Runtime;
  componentsMap: ComponentsMap;
  onAction?: (payload: ActionPayload) => void;
  onClientError?: (payload: ClientError) => void;
  onWarning?: (diagnostic: Diagnostic) => void;
  onHostEffect?: (effect: HostEffect) => void;
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
    throw new Error("RuntimeProvider is required.");
  }
  return context;
}

export function useSurfaceContext(): SurfaceContextValue {
  const context = useContext(SurfaceContext);
  if (!context) {
    throw new Error("SurfaceRenderer is required for surface-bound hooks.");
  }
  return context;
}
