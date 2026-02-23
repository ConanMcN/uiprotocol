import { Fragment, useCallback, useMemo, useRef } from "react";
import {
  DIAGNOSTIC_CODES,
  resolveDynamicValue,
  validateValue
} from "@uiprotocol/core";
import { SurfaceContext, useRuntimeContext } from "./context";
import { NodeErrorBoundary } from "./error-boundary";
import { useSurface } from "./hooks/useSurface";
import type {
  Action,
  HostEffect,
  UINode
} from "@uiprotocol/core";
import type { ActionDispatchOptions } from "./types";

interface SurfaceRendererProps {
  surfaceId: string;
  fallback?: React.ReactNode;
  getChildIds?: (node: UINode) => string[];
}

const DEFAULT_FALLBACK = <div data-uiprotocol-fallback="true" />;

const defaultGetChildIds = (node: UINode): string[] => node.children ?? [];

function UnknownComponent({ node }: { node: UINode }) {
  return (
    <div
      data-uiprotocol-unknown-component={node.type}
    >{`Unknown component: ${node.type}`}</div>
  );
}

export function SurfaceRenderer({
  surfaceId,
  fallback = DEFAULT_FALLBACK,
  getChildIds = defaultGetChildIds
}: SurfaceRendererProps) {
  const ctx = useRuntimeContext();
  const { surface } = useSurface(surfaceId);
  const warned = useRef(new Set<string>());

  const warnOnce = useCallback(
    (key: string, warning: Parameters<NonNullable<typeof ctx.onWarning>>[0]) => {
      if (!ctx.onWarning) {
        return;
      }

      if (warned.current.has(key)) {
        return;
      }

      warned.current.add(key);
      ctx.onWarning(warning);
    },
    [ctx]
  );

  const dispatchAction = useCallback(
    (action: Action, options?: ActionDispatchOptions): boolean => {
      if (!surface) {
        return false;
      }

      if (!action || typeof action.event !== "string" || action.event.length === 0) {
        ctx.onClientError?.({
          code: DIAGNOSTIC_CODES.invalidEnvelope,
          message: "Action event is required.",
          surfaceId,
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
            scopePath: "/"
          },
          ctx.runtime.functionRegistry
        );

        if (!validation.ok) {
          for (const error of validation.errors) {
            ctx.onClientError?.({
              ...error,
              surfaceId,
              nodeId: options?.nodeId
            });
          }
          return false;
        }
      }

      if (action.openUrl) {
        const effect: HostEffect = {
          type: "openUrl",
          surfaceId,
          nodeId: options?.nodeId,
          url: action.openUrl,
          action
        };
        if (ctx.onHostEffect) {
          ctx.onHostEffect(effect);
        } else {
          ctx.onWarning?.({
            code: DIAGNOSTIC_CODES.hostEffectDropped,
            message: "openUrl effect dropped because onHostEffect is not configured.",
            severity: "warning",
            surfaceId,
            nodeId: options?.nodeId
          });
        }
      }

      ctx.onAction?.({
        surfaceId,
        nodeId: options?.nodeId,
        action,
        dataModel: surface.dataModel
      });

      return true;
    },
    [ctx, surface, surfaceId]
  );

  const renderNode = useMemo(() => {
    if (!surface) {
      return () => fallback;
    }

    const renderInternal = (
      nodeId: string,
      scopePath = "/",
      ancestors = new Set<string>()
    ): React.ReactNode => {
      if (ancestors.has(nodeId)) {
        warnOnce(`cycle:${surfaceId}:${nodeId}`, {
          code: DIAGNOSTIC_CODES.invalidEnvelope,
          message: `Detected node cycle at '${nodeId}'.`,
          severity: "warning",
          surfaceId,
          nodeId
        });
        return null;
      }

      const node = surface.nodes.get(nodeId);
      if (!node) {
        return (
          <div data-uiprotocol-missing-node={nodeId}>{`Missing node: ${nodeId}`}</div>
        );
      }

      if (!node.type) {
        return (
          <div data-uiprotocol-missing-node={nodeId}>{`Missing node type: ${nodeId}`}</div>
        );
      }

      const ComponentRenderer = ctx.componentsMap[node.type];
      if (!ComponentRenderer) {
        warnOnce(`unknown:${surfaceId}:${node.type}`, {
          code: DIAGNOSTIC_CODES.unknownComponent,
          message: `Unknown component type '${node.type}'.`,
          severity: "warning",
          surfaceId,
          nodeId
        });

        const fallbackNode = ctx.unknownComponentFallback?.({
          node,
          surfaceId
        });

        return fallbackNode ?? <UnknownComponent node={node} />;
      }

      const childIds = getChildIds(node);
      const nextAncestors = new Set(ancestors);
      nextAncestors.add(nodeId);

      const renderChild = (
        childId: string,
        key?: string | number,
        childScopePath = scopePath
      ) => (
        <Fragment key={key ?? `${nodeId}:${childId}`}>
          {renderInternal(childId, childScopePath, nextAncestors)}
        </Fragment>
      );

      const renderedChildren = childIds.map((childId, index) =>
        renderChild(childId, `${nodeId}:${childId}:${index}`)
      );

      return (
        <SurfaceContext.Provider value={{ surfaceId, scopePath }}>
          <NodeErrorBoundary
            fallback={<div data-uiprotocol-render-error={nodeId}>{`Render failed: ${nodeId}`}</div>}
            onError={(error) => {
              ctx.onClientError?.({
                code: DIAGNOSTIC_CODES.renderFailed,
                message: error.message,
                surfaceId,
                nodeId,
                details: {
                  stack: error.stack
                }
              });
            }}
          >
            <ComponentRenderer
              node={node}
              surface={surface}
              dataModel={surface.dataModel}
              scopePath={scopePath}
              childIds={childIds}
              renderedChildren={renderedChildren}
              renderChild={renderChild}
              resolve={(value) =>
                resolveDynamicValue(value, {
                  dataModel: surface.dataModel,
                  scopePath,
                  functionRegistry: ctx.runtime.functionRegistry
                })
              }
              setData={(path, value, options) => {
                if (options?.omitValue) {
                  ctx.runtime.applySingle({
                    type: "data:remove",
                    surfaceId,
                    timestamp: Date.now(),
                    path
                  });
                } else {
                  ctx.runtime.applySingle({
                    type: "data:set",
                    surfaceId,
                    timestamp: Date.now(),
                    path,
                    value
                  });
                }
              }}
              dispatchAction={(action, opts) =>
                dispatchAction(action, { ...opts, nodeId: opts?.nodeId ?? nodeId })
              }
            />
          </NodeErrorBoundary>
        </SurfaceContext.Provider>
      );
    };

    return renderInternal;
  }, [ctx, dispatchAction, fallback, getChildIds, surface, surfaceId, warnOnce]);

  if (!surface) {
    return fallback;
  }

  if (!surface.nodes.has("root")) {
    warnOnce(`root-missing:${surfaceId}`, {
      code: DIAGNOSTIC_CODES.rootMissing,
      message: `Surface '${surfaceId}' has no root node (id: root).`,
      severity: "warning",
      surfaceId
    });
    return fallback;
  }

  return <>{renderNode("root", "/")}</>;
}
