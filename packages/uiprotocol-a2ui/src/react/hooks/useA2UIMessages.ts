import { useCallback, useMemo, useSyncExternalStore } from "react";
import { parseMessage } from "../../core";
import { useRuntimeContext } from "../context";
import type { ProcessMessageResult } from "../types";

export function useA2UIMessages() {
  const runtime = useRuntimeContext();

  const revision = useSyncExternalStore(
    runtime.manager.subscribe.bind(runtime.manager),
    () => runtime.manager.getRevision()
  );

  const surfaces = useMemo(
    () => runtime.manager.getSurfaces(),
    [runtime.manager, revision]
  );

  const processMessage = useCallback(
    (raw: unknown): ProcessMessageResult => {
      const parseResult = parseMessage(raw);

      for (const warning of parseResult.warnings) {
        runtime.onWarning?.(warning);
      }

      if (!parseResult.ok) {
        for (const error of parseResult.errors) {
          runtime.onClientError?.({
            code: error.code,
            message: error.message,
            surfaceId: error.surfaceId,
            componentId: error.componentId,
            path: error.path,
            details: error.details
          });
        }

        return { parseResult };
      }

      const applyResult = runtime.manager.apply(parseResult.value);
      for (const diagnostic of applyResult.diagnostics) {
        if (diagnostic.severity === "warning") {
          runtime.onWarning?.(diagnostic);
        } else {
          runtime.onClientError?.({
            code: diagnostic.code,
            message: diagnostic.message,
            surfaceId: diagnostic.surfaceId,
            componentId: diagnostic.componentId,
            path: diagnostic.path,
            details: diagnostic.details
          });
        }
      }

      return {
        parseResult,
        applyResult
      };
    },
    [runtime]
  );

  const processMessages = useCallback(
    (raw: unknown[] | string): ProcessMessageResult[] => {
      if (typeof raw === "string") {
        return raw
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line) => processMessage(line));
      }

      return raw.map((message) => processMessage(message));
    },
    [processMessage]
  );

  return {
    processMessage,
    processMessages,
    surfaces
  };
}
