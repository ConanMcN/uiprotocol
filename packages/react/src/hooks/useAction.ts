import { useCallback } from "react";
import {
  DIAGNOSTIC_CODES,
  validateValue
} from "@uiprotocol/core";
import type {
  Action,
  FunctionCall,
  HostEffect
} from "@uiprotocol/core";
import { useRuntimeContext, useSurfaceContext } from "../context";

export interface DispatchActionOptions {
  nodeId?: string;
  checks?: FunctionCall[];
  pattern?: string;
  value?: unknown;
}

export function useAction() {
  const { runtime, onAction, onClientError, onWarning, onHostEffect } = useRuntimeContext();
  const surfaceContext = useSurfaceContext();

  return useCallback(
    (action: Action, options?: DispatchActionOptions): boolean => {
      const surface = runtime.getSurface(surfaceContext.surfaceId);
      if (!surface) {
        onClientError?.({
          code: DIAGNOSTIC_CODES.surfaceNotFound,
          message: `Surface '${surfaceContext.surfaceId}' does not exist.`,
          surfaceId: surfaceContext.surfaceId,
          nodeId: options?.nodeId
        });
        return false;
      }

      if (!action || typeof action.event !== "string" || action.event.length === 0) {
        onClientError?.({
          code: DIAGNOSTIC_CODES.invalidEnvelope,
          message: "Action event is required.",
          surfaceId: surfaceContext.surfaceId,
          nodeId: options?.nodeId
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
            onClientError?.({
              ...item,
              surfaceId: surfaceContext.surfaceId,
              nodeId: options?.nodeId
            });
          }
          return false;
        }
      }

      if (action.openUrl) {
        const effect: HostEffect = {
          type: "openUrl",
          surfaceId: surfaceContext.surfaceId,
          nodeId: options?.nodeId,
          url: action.openUrl,
          action
        };

        if (onHostEffect) {
          onHostEffect(effect);
        } else {
          onWarning?.({
            code: DIAGNOSTIC_CODES.hostEffectDropped,
            message: "openUrl effect dropped because onHostEffect is not configured.",
            severity: "warning",
            surfaceId: surfaceContext.surfaceId,
            nodeId: options?.nodeId
          });
        }
      }

      onAction?.({
        surfaceId: surfaceContext.surfaceId,
        nodeId: options?.nodeId,
        action,
        dataModel: surface.dataModel
      });

      return true;
    },
    [runtime, onAction, onClientError, onWarning, onHostEffect, surfaceContext.surfaceId, surfaceContext.scopePath]
  );
}
