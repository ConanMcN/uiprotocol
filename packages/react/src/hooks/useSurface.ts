import { useMemo, useSyncExternalStore } from "react";
import { useRuntimeContext } from "../context";

export function useSurface(surfaceId: string) {
  const { runtime } = useRuntimeContext();

  const revision = useSyncExternalStore(
    runtime.subscribe.bind(runtime),
    () => runtime.getRevision()
  );

  const surface = useMemo(
    () => runtime.getSurface(surfaceId),
    [runtime, surfaceId, revision]
  );

  return {
    surface,
    nodes: surface?.nodes,
    dataModel: surface?.dataModel,
    isReady: Boolean(surface?.nodes.has("root"))
  };
}
