import { useCallback, useMemo, useSyncExternalStore } from "react";
import type { ProtocolAdapter } from "@uiprotocol/core";
import { useRuntimeContext } from "../context";
import type { ProcessCommandsResult } from "../types";

export function useMessages(adapter: ProtocolAdapter) {
  const { runtime, onWarning, onClientError } = useRuntimeContext();

  const revision = useSyncExternalStore(
    runtime.subscribe.bind(runtime),
    () => runtime.getRevision()
  );

  const surfaces = useMemo(
    () => runtime.getSurfaces(),
    [runtime, revision]
  );

  const processMessage = useCallback(
    (raw: unknown): ProcessCommandsResult => {
      const { parseResult, applyResult } = runtime.processMessage(adapter, raw);

      for (const warning of parseResult.warnings) {
        onWarning?.(warning);
      }

      if (!parseResult.ok) {
        for (const error of parseResult.errors) {
          onClientError?.({
            code: error.code,
            message: error.message,
            surfaceId: error.surfaceId,
            nodeId: error.nodeId,
            path: error.path,
            details: error.details
          });
        }

        return { parseResult };
      }

      if (applyResult) {
        for (const diag of applyResult.diagnostics) {
          if (diag.severity === "warning") {
            onWarning?.(diag);
          } else {
            onClientError?.({
              code: diag.code,
              message: diag.message,
              surfaceId: diag.surfaceId,
              nodeId: diag.nodeId,
              path: diag.path,
              details: diag.details
            });
          }
        }
      }

      return { parseResult, applyResult };
    },
    [runtime, adapter, onWarning, onClientError]
  );

  const processMessages = useCallback(
    (raw: unknown[] | string): ProcessCommandsResult[] => {
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
