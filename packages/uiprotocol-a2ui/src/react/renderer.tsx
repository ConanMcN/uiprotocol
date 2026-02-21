import { Fragment, useCallback, useMemo, useRef } from "react";
import {
  DIAGNOSTIC_CODES,
  collectChildComponentIds,
  resolveDynamicValue,
  validateValue
} from "../core";
import { SurfaceContext, useRuntimeContext } from "./context";
import { NodeErrorBoundary } from "./error-boundary";
import { useA2UISurface } from "./hooks/useA2UISurface";
import type {
  A2UIAction,
  A2UIComponent,
  A2UIHostEffect
} from "../core";
import type { ActionDispatchOptions } from "./types";

interface A2UIRendererProps {
  surfaceId: string;
  fallback?: React.ReactNode;
}

const DEFAULT_FALLBACK = <div data-a2ui-fallback="true" />;

function UnknownComponent({ component }: { component: A2UIComponent }) {
  return (
    <div
      data-a2ui-unknown-component={component.component}
    >{`Unknown component: ${component.component}`}</div>
  );
}

export function A2UIRenderer({ surfaceId, fallback = DEFAULT_FALLBACK }: A2UIRendererProps) {
  const runtime = useRuntimeContext();
  const { surface } = useA2UISurface(surfaceId);
  const warned = useRef(new Set<string>());

  const warnOnce = useCallback(
    (key: string, warning: Parameters<NonNullable<typeof runtime.onWarning>>[0]) => {
      if (!runtime.onWarning) {
        return;
      }

      if (warned.current.has(key)) {
        return;
      }

      warned.current.add(key);
      runtime.onWarning(warning);
    },
    [runtime]
  );

  const dispatchAction = useCallback(
    (action: A2UIAction, options?: ActionDispatchOptions): boolean => {
      if (!surface) {
        return false;
      }

      if (!action || typeof action.event !== "string" || action.event.length === 0) {
        runtime.onClientError?.({
          code: DIAGNOSTIC_CODES.invalidEnvelope,
          message: "Action event is required.",
          surfaceId,
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
            scopePath: "/"
          },
          runtime.functionRegistry
        );

        if (!validation.ok) {
          for (const error of validation.errors) {
            runtime.onClientError?.({
              ...error,
              surfaceId,
              componentId: options?.componentId
            });
          }
          return false;
        }
      }

      if (action.openUrl) {
        const effect: A2UIHostEffect = {
          type: "openUrl",
          surfaceId,
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
            surfaceId,
            componentId: options?.componentId
          });
        }
      }

      runtime.onAction?.({
        surfaceId,
        componentId: options?.componentId,
        action,
        dataModel: surface.dataModel
      });

      return true;
    },
    [runtime, surface, surfaceId]
  );

  const renderNode = useMemo(() => {
    if (!surface) {
      return () => fallback;
    }

    const renderInternal = (
      componentId: string,
      scopePath = "/",
      ancestors = new Set<string>()
    ): React.ReactNode => {
      if (ancestors.has(componentId)) {
        warnOnce(`cycle:${surfaceId}:${componentId}`, {
          code: DIAGNOSTIC_CODES.invalidEnvelope,
          message: `Detected component cycle at '${componentId}'.`,
          severity: "warning",
          surfaceId,
          componentId
        });
        return null;
      }

      const component = surface.components.get(componentId);
      if (!component) {
        return (
          <div data-a2ui-missing-component={componentId}>{`Missing component: ${componentId}`}</div>
        );
      }

      if (!component.component) {
        return (
          <div data-a2ui-missing-component={componentId}>{`Missing component type: ${componentId}`}</div>
        );
      }

      const ComponentRenderer = runtime.componentsMap[component.component];
      if (!ComponentRenderer) {
        warnOnce(`unknown:${surfaceId}:${component.component}`, {
          code: DIAGNOSTIC_CODES.unknownComponent,
          message: `Unknown component type '${component.component}'.`,
          severity: "warning",
          surfaceId,
          componentId
        });

        const fallbackNode = runtime.unknownComponentFallback?.({
          component,
          surfaceId
        });

        return fallbackNode ?? <UnknownComponent component={component} />;
      }

      const childIds = collectChildComponentIds(component);
      const nextAncestors = new Set(ancestors);
      nextAncestors.add(componentId);

      const renderChild = (
        childId: string,
        key?: string | number,
        childScopePath = scopePath
      ) => (
        <Fragment key={key ?? `${componentId}:${childId}`}>
          {renderInternal(childId, childScopePath, nextAncestors)}
        </Fragment>
      );

      const renderedChildren = childIds.map((childId, index) =>
        renderChild(childId, `${componentId}:${childId}:${index}`)
      );

      return (
        <SurfaceContext.Provider value={{ surfaceId, scopePath }}>
          <NodeErrorBoundary
            fallback={<div data-a2ui-render-error={componentId}>{`Render failed: ${componentId}`}</div>}
            onError={(error) => {
              runtime.onClientError?.({
                code: DIAGNOSTIC_CODES.renderFailed,
                message: error.message,
                surfaceId,
                componentId,
                details: {
                  stack: error.stack
                }
              });
            }}
          >
            <ComponentRenderer
              component={component}
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
                  functionRegistry: runtime.functionRegistry
                })
              }
              setData={(path, value, options) => {
                const payload: {
                  version: "v0.9";
                  updateDataModel: {
                    surfaceId: string;
                    path: string;
                    value?: unknown;
                  };
                } = {
                  version: "v0.9",
                  updateDataModel: {
                    surfaceId,
                    path
                  }
                };

                if (!options?.omitValue) {
                  payload.updateDataModel.value = value;
                }

                runtime.manager.apply(payload);
              }}
              dispatchAction={dispatchAction}
            />
          </NodeErrorBoundary>
        </SurfaceContext.Provider>
      );
    };

    return renderInternal;
  }, [dispatchAction, fallback, runtime, surface, surfaceId, warnOnce]);

  if (!surface) {
    return fallback;
  }

  if (!surface.components.has("root")) {
    warnOnce(`root-missing:${surfaceId}`, {
      code: DIAGNOSTIC_CODES.rootMissing,
      message: `Surface '${surfaceId}' has no root component (id: root).`,
      severity: "warning",
      surfaceId
    });
    return fallback;
  }

  return <>{renderNode("root", "/")}</>;
}
