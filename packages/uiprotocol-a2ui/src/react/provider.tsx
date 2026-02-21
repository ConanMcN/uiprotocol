import { useMemo, useRef } from "react";
import { FunctionRegistry, createSurfaceManager } from "../core";
import { RuntimeContext } from "./context";
import type { A2UIProviderProps } from "./types";

export function A2UIProvider({
  children,
  componentsMap,
  onAction,
  onClientError,
  onWarning,
  onHostEffect,
  unknownComponentFallback
}: A2UIProviderProps) {
  const managerRef = useRef(
    createSurfaceManager({
      onDiagnostic(diagnostic) {
        if (diagnostic.severity === "warning") {
          onWarning?.(diagnostic);
          return;
        }

        onClientError?.({
          code: diagnostic.code,
          message: diagnostic.message,
          surfaceId: diagnostic.surfaceId,
          componentId: diagnostic.componentId,
          path: diagnostic.path,
          details: diagnostic.details
        });
      }
    })
  );

  const functionRegistryRef = useRef(new FunctionRegistry());

  const contextValue = useMemo(
    () => ({
      manager: managerRef.current,
      functionRegistry: functionRegistryRef.current,
      componentsMap,
      onAction,
      onClientError,
      onWarning,
      onHostEffect,
      unknownComponentFallback
    }),
    [
      componentsMap,
      onAction,
      onClientError,
      onWarning,
      onHostEffect,
      unknownComponentFallback
    ]
  );

  return (
    <RuntimeContext.Provider value={contextValue}>{children}</RuntimeContext.Provider>
  );
}
