import { useMemo, useRef } from "react";
import { Runtime } from "@uiprotocol/core";
import { RuntimeContext } from "./context";
import type { RuntimeProviderProps } from "./types";

export function RuntimeProvider({
  children,
  componentsMap,
  trustPolicy,
  onAction,
  onClientError,
  onWarning,
  onHostEffect,
  unknownComponentFallback
}: RuntimeProviderProps) {
  const runtimeRef = useRef(
    new Runtime({ trustPolicy })
  );

  const contextValue = useMemo(
    () => ({
      runtime: runtimeRef.current,
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
