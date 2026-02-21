import { useCallback, useSyncExternalStore } from "react";
import { resolveByPointer, resolvePointerPath } from "../../core";
import { useRuntimeContext, useSurfaceContext } from "../context";

export interface SetValueOptions {
  remove?: boolean;
}

export function useDataBinding(path: string) {
  const runtime = useRuntimeContext();
  const surfaceContext = useSurfaceContext();

  const absolutePath = resolvePointerPath(path, surfaceContext.scopePath);

  const value = useSyncExternalStore(
    runtime.manager.subscribe.bind(runtime.manager),
    () => {
      const surface = runtime.manager.getSurface(surfaceContext.surfaceId);
      if (!surface) {
        return undefined;
      }
      return resolveByPointer(surface.dataModel, absolutePath);
    }
  );

  const setValue = useCallback(
    (nextValue: unknown, options?: SetValueOptions) => {
      const message: {
        version: "v0.9";
        updateDataModel: {
          surfaceId: string;
          path: string;
          value?: unknown;
        };
      } = {
        version: "v0.9",
        updateDataModel: {
          surfaceId: surfaceContext.surfaceId,
          path: absolutePath
        }
      };

      if (!options?.remove) {
        message.updateDataModel.value = nextValue;
      }

      runtime.manager.apply(message);
    },
    [runtime, surfaceContext.surfaceId, absolutePath]
  );

  return {
    path: absolutePath,
    value,
    setValue
  };
}
