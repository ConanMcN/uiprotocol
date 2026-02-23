import { useCallback, useRef, useSyncExternalStore } from "react";
import {
  DIAGNOSTIC_CODES,
  resolveByPointer,
  resolvePointerPath
} from "@uiprotocol/core";
import { useRuntimeContext, useSurfaceContext } from "../context";

export interface SetValueOptions {
  remove?: boolean;
}

export function useDataBinding(path: string) {
  const { runtime, onWarning } = useRuntimeContext();
  const surfaceContext = useSurfaceContext();
  const warnedMissing = useRef(false);

  const absolutePath = resolvePointerPath(path, surfaceContext.scopePath);

  const value = useSyncExternalStore(
    runtime.subscribe.bind(runtime),
    () => {
      const surface = runtime.getSurface(surfaceContext.surfaceId);
      if (!surface) {
        if (!warnedMissing.current) {
          warnedMissing.current = true;
          onWarning?.({
            code: DIAGNOSTIC_CODES.surfaceNotFound,
            message: `Surface '${surfaceContext.surfaceId}' not found in useDataBinding.`,
            severity: "warning",
            surfaceId: surfaceContext.surfaceId,
            path: absolutePath
          });
        }
        return undefined;
      }
      warnedMissing.current = false;
      return resolveByPointer(surface.dataModel, absolutePath);
    }
  );

  const setValue = useCallback(
    (nextValue: unknown, options?: SetValueOptions) => {
      if (options?.remove) {
        runtime.applySingle({
          type: "data:remove",
          surfaceId: surfaceContext.surfaceId,
          timestamp: Date.now(),
          path: absolutePath
        });
      } else {
        runtime.applySingle({
          type: "data:set",
          surfaceId: surfaceContext.surfaceId,
          timestamp: Date.now(),
          path: absolutePath,
          value: nextValue
        });
      }
    },
    [runtime, surfaceContext.surfaceId, absolutePath]
  );

  return {
    path: absolutePath,
    value,
    setValue
  };
}
