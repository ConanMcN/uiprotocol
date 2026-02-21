import { createRoot } from "react-dom/client";
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore, type ReactElement, type ReactNode } from "react";
import {
  A2UIProvider,
  A2UIRenderer,
  useA2UIMessages,
  useAction,
  useDataBinding,
  useFormBinding,
  type A2UIAdapterProps,
  type ComponentsMap
} from "../../src/react";
import type { A2UIAction, FunctionCall } from "../../src/core";

// ---- Test Probe Components ----

function Container({ component, renderedChildren }: A2UIAdapterProps) {
  return <div data-testid={`component-${component.id}`}>{renderedChildren}</div>;
}

function Text({ component, resolve }: A2UIAdapterProps) {
  const value = resolve(component.text as string | { path: string });
  return <span>{String(value ?? "")}</span>;
}

function Boom(): ReactElement {
  throw new Error("boom");
}

function BindingProbe({ component }: A2UIAdapterProps) {
  const { value, setValue } = useDataBinding(component.path as string);

  return (
    <button
      data-testid="binding-probe"
      onClick={() => setValue(component.nextValue)}
      type="button"
    >
      {String(value ?? "")}
    </button>
  );
}

function FormProbe({ component }: A2UIAdapterProps) {
  const binding = useFormBinding({
    path: component.path as string,
    pattern: component.pattern as string | undefined,
    checks: component.checks as FunctionCall[] | undefined
  });

  return (
    <div>
      <input
        data-testid="form-probe"
        value={String(binding.value ?? "")}
        onChange={(event) => {
          binding.onChange(event.currentTarget.value);
        }}
      />
      <span data-testid="form-probe-error">{binding.error ?? ""}</span>
    </div>
  );
}

function ActionProbe({ component }: A2UIAdapterProps) {
  const sendAction = useAction();

  return (
    <button
      data-testid="action-probe"
      onClick={() => {
        sendAction(component.action as A2UIAction, {
          componentId: component.id,
          checks: component.checks as FunctionCall[] | undefined,
          pattern: component.pattern as string | undefined,
          value: component.valueForValidation
        });
      }}
      type="button"
    >
      Action
    </button>
  );
}

function ListProbe({ component, resolve, renderChild }: A2UIAdapterProps) {
  const itemsPath = (component.itemsPath as string) ?? "/items";
  const items = resolve({ path: itemsPath } as { path: string });
  const template = component.template as { child?: string } | undefined;

  if (!template?.child || !Array.isArray(items)) {
    return null;
  }

  return (
    <ul data-testid="list-probe">
      {items.map((_, index) => (
        <li key={index}>{renderChild(template.child as string, index, `${itemsPath}/${index}`)}</li>
      ))}
    </ul>
  );
}

const componentsMap: ComponentsMap = {
  Container,
  Text,
  Boom,
  BindingProbe,
  FormProbe,
  ActionProbe,
  ListProbe
};

// ---- Types ----

interface A2UIApi {
  processMessage: (msg: unknown) => unknown;
  processMessages: (msgs: unknown[] | string) => unknown[];
}

declare global {
  interface Window {
    __A2UI_API__: A2UIApi | null;
    __A2UI_ACTIONS__: Array<unknown>;
    __A2UI_ERRORS__: Array<unknown>;
    __A2UI_WARNINGS__: Array<unknown>;
    __A2UI_HOST_EFFECTS__: Array<unknown>;
    __addSurface__: (id: string) => void;
    __removeSurface__: (id: string) => void;
  }
}

// Expose arrays for callback capture
window.__A2UI_ACTIONS__ = [];
window.__A2UI_ERRORS__ = [];
window.__A2UI_WARNINGS__ = [];
window.__A2UI_HOST_EFFECTS__ = [];

function ApiExposer() {
  const api = useA2UIMessages();

  useEffect(() => {
    window.__A2UI_API__ = {
      processMessage: api.processMessage,
      processMessages: api.processMessages
    };
    return () => {
      window.__A2UI_API__ = null;
    };
  }, [api.processMessage, api.processMessages]);

  return null;
}

/**
 * Manages surface IDs imperatively via window functions.
 * No automatic derivation from api.surfaces — avoids infinite re-render loops.
 */
function SurfaceManager() {
  const [surfaceIds, setSurfaceIds] = useState<string[]>([]);

  useEffect(() => {
    window.__addSurface__ = (id: string) => {
      setSurfaceIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    };
    window.__removeSurface__ = (id: string) => {
      setSurfaceIds((prev) => prev.filter((s) => s !== id));
    };
  }, []);

  return (
    <div data-testid="surfaces-container">
      {surfaceIds.map((id) => (
        <div key={id} data-testid={`surface-${id}`}>
          <A2UIRenderer surfaceId={id} fallback={<div data-testid={`fallback-${id}`}>fallback</div>} />
        </div>
      ))}
    </div>
  );
}

function App() {
  return (
    <A2UIProvider
      componentsMap={componentsMap}
      onAction={(payload) => {
        window.__A2UI_ACTIONS__.push(payload);
      }}
      onClientError={(payload) => {
        window.__A2UI_ERRORS__.push(payload);
      }}
      onWarning={(diagnostic) => {
        window.__A2UI_WARNINGS__.push(diagnostic);
      }}
      onHostEffect={(effect) => {
        window.__A2UI_HOST_EFFECTS__.push(effect);
      }}
    >
      <ApiExposer />
      <SurfaceManager />
    </A2UIProvider>
  );
}

const root = createRoot(document.getElementById("root")!);
root.render(<App />);
