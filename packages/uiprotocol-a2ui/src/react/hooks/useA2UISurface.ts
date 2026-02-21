import { useMemo, useSyncExternalStore } from "react";
import { useRuntimeContext } from "../context";

export function useA2UISurface(surfaceId: string) {
  const runtime = useRuntimeContext();

  const revision = useSyncExternalStore(
    runtime.manager.subscribe.bind(runtime.manager),
    () => runtime.manager.getRevision()
  );

  const surface = useMemo(
    () => runtime.manager.getSurface(surfaceId),
    [runtime.manager, surfaceId, revision]
  );

  return {
    surface,
    components: surface?.components,
    dataModel: surface?.dataModel,
    isReady: Boolean(surface?.components.has("root"))
  };
}
