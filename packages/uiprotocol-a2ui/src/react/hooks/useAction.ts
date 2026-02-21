import { useCallback } from "react";
import { DIAGNOSTIC_CODES, validateValue } from "../../core";
import type {
  A2UIAction,
  A2UIHostEffect,
  FunctionCall
} from "../../core";
import { useRuntimeContext, useSurfaceContext } from "../context";

export interface DispatchActionOptions {
  componentId?: string;
  checks?: FunctionCall[];
  pattern?: string;
  value?: unknown;
}

export function useAction() {
  const runtime = useRuntimeContext();
  const surfaceContext = useSurfaceContext();

  return useCallback(
    (action: A2UIAction, options?: DispatchActionOptions): boolean => {
      const surface = runtime.manager.getSurface(surfaceContext.surfaceId);
      if (!surface) {
        runtime.onClientError?.({
          code: DIAGNOSTIC_CODES.surfaceNotFound,
          message: `Surface '${surfaceContext.surfaceId}' does not exist.`,
          surfaceId: surfaceContext.surfaceId,
          componentId: options?.componentId
        });
        return false;
      }

      if (!action || typeof action.event !== "string" || action.event.length === 0) {
        runtime.onClientError?.({
          code: DIAGNOSTIC_CODES.invalidEnvelope,
          message: "Action event is required.",
          surfaceId: surfaceContext.surfaceId,
          componentId: options?.componentId
        });
        return false;
      }

      if (options?.checks || options?.pattern) {
        const validation = validateValue(
          {
            value: options.value,
            checks: options.checks,
            pattern: options.pattern,
            dataModel: surface.dataModel,
            scopePath: surfaceContext.scopePath
          },
          runtime.functionRegistry
        );

        if (!validation.ok) {
          for (const item of validation.errors) {
            runtime.onClientError?.({
              ...item,
              surfaceId: surfaceContext.surfaceId,
              componentId: options?.componentId
            });
          }
          return false;
        }
      }

      if (action.openUrl) {
        const effect: A2UIHostEffect = {
          type: "openUrl",
          surfaceId: surfaceContext.surfaceId,
          componentId: options?.componentId,
          url: action.openUrl,
          action
        };

        if (runtime.onHostEffect) {
          runtime.onHostEffect(effect);
        } else {
          runtime.onWarning?.({
            code: DIAGNOSTIC_CODES.hostEffectDropped,
            message: "openUrl effect dropped because onHostEffect is not configured.",
            severity: "warning",
            surfaceId: surfaceContext.surfaceId,
            componentId: options?.componentId
          });
        }
      }

      runtime.onAction?.({
        surfaceId: surfaceContext.surfaceId,
        componentId: options?.componentId,
        action,
        dataModel: surface.dataModel
      });

      return true;
    },
    [runtime, surfaceContext.surfaceId, surfaceContext.scopePath]
  );
}
