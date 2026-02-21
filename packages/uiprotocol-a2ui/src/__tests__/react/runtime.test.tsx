import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useEffect, type ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import type { A2UIAction, A2UIComponent, FunctionCall } from "../../core";
import {
  A2UIProvider,
  A2UIRenderer,
  useA2UIMessages,
  useAction,
  useDataBinding,
  useFormBinding,
  type A2UIAdapterProps,
  type ComponentsMap
} from "../../react";

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
    <ul>
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

type MessagesApi = ReturnType<typeof useA2UIMessages>;

function RuntimeHarness({
  onReady,
  surfaceId = "s1"
}: {
  onReady: (api: MessagesApi) => void;
  surfaceId?: string;
}) {
  const api = useA2UIMessages();

  useEffect(() => {
    onReady(api);
  }, [api, onReady]);

  return <A2UIRenderer surfaceId={surfaceId} fallback={<div data-testid="fallback" />} />;
}

function processMessage(api: MessagesApi | undefined, message: unknown): void {
  if (!api) {
    throw new Error("messages api not ready");
  }

  act(() => {
    api.processMessage(message);
  });
}

describe("@uiprotocol/a2ui react runtime", () => {
  it("renders known components and warns for unknown ones", async () => {
    const onWarning = vi.fn();
    let api: MessagesApi | undefined;

    render(
      <A2UIProvider componentsMap={componentsMap} onWarning={onWarning}>
        <RuntimeHarness onReady={(next) => (api = next)} />
      </A2UIProvider>
    );

    await waitFor(() => expect(api).toBeDefined());

    processMessage(api, {
      version: "v0.9",
      createSurface: {
        surfaceId: "s1"
      }
    });

    processMessage(api, {
      version: "v0.9",
      updateComponents: {
        surfaceId: "s1",
        components: [
          {
            id: "root",
            component: "Container",
            children: ["known", "unknown"]
          },
          {
            id: "known",
            component: "Text",
            text: { path: "/title" }
          },
          {
            id: "unknown",
            component: "NotInMap"
          }
        ]
      }
    });

    processMessage(api, {
      version: "v0.9",
      updateDataModel: {
        surfaceId: "s1",
        path: "/title",
        value: "Hello"
      }
    });

    expect(await screen.findByText("Hello")).toBeTruthy();
    expect(await screen.findByText("Unknown component: NotInMap")).toBeTruthy();
    expect(onWarning).toHaveBeenCalledWith(
      expect.objectContaining({ code: "A2UI_UNKNOWN_COMPONENT" })
    );
  });

  it("recovers from node render failures", async () => {
    const onClientError = vi.fn();
    let api: MessagesApi | undefined;

    render(
      <A2UIProvider componentsMap={componentsMap} onClientError={onClientError}>
        <RuntimeHarness onReady={(next) => (api = next)} />
      </A2UIProvider>
    );

    await waitFor(() => expect(api).toBeDefined());

    processMessage(api, {
      version: "v0.9",
      createSurface: { surfaceId: "s1" }
    });

    processMessage(api, {
      version: "v0.9",
      updateComponents: {
        surfaceId: "s1",
        components: [
          { id: "root", component: "Container", children: ["ok", "bad"] },
          { id: "ok", component: "Text", text: "still here" },
          { id: "bad", component: "Boom" }
        ]
      }
    });

    expect(await screen.findByText("still here")).toBeTruthy();
    expect(await screen.findByText("Render failed: bad")).toBeTruthy();
    expect(onClientError).toHaveBeenCalledWith(
      expect.objectContaining({ code: "A2UI_RENDER_FAILED" })
    );
  });

  it("supports useDataBinding updates", async () => {
    let api: MessagesApi | undefined;

    render(
      <A2UIProvider componentsMap={componentsMap}>
        <RuntimeHarness onReady={(next) => (api = next)} />
      </A2UIProvider>
    );

    await waitFor(() => expect(api).toBeDefined());

    processMessage(api, {
      version: "v0.9",
      createSurface: { surfaceId: "s1" }
    });

    processMessage(api, {
      version: "v0.9",
      updateComponents: {
        surfaceId: "s1",
        components: [
          {
            id: "root",
            component: "BindingProbe",
            path: "/count",
            nextValue: 2
          }
        ]
      }
    });

    processMessage(api, {
      version: "v0.9",
      updateDataModel: {
        surfaceId: "s1",
        path: "/count",
        value: 1
      }
    });

    const button = await screen.findByTestId("binding-probe");
    expect(button.textContent).toBe("1");

    fireEvent.click(button);
    expect(button.textContent).toBe("2");
  });

  it("uses form binding with block-and-report validation", async () => {
    const onClientError = vi.fn();
    let api: MessagesApi | undefined;

    render(
      <A2UIProvider componentsMap={componentsMap} onClientError={onClientError}>
        <RuntimeHarness onReady={(next) => (api = next)} />
      </A2UIProvider>
    );

    await waitFor(() => expect(api).toBeDefined());

    processMessage(api, {
      version: "v0.9",
      createSurface: { surfaceId: "s1" }
    });

    processMessage(api, {
      version: "v0.9",
      updateComponents: {
        surfaceId: "s1",
        components: [
          {
            id: "root",
            component: "FormProbe",
            path: "/email",
            pattern: "^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$"
          }
        ]
      }
    });

    const input = (await screen.findByTestId("form-probe")) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "bad-email" } });

    expect(screen.getByTestId("form-probe-error").textContent).toBe(
      "Value does not match required pattern."
    );
    expect(onClientError).toHaveBeenCalledWith(
      expect.objectContaining({ code: "A2UI_VALIDATION_REGEX_FAILED" })
    );

    fireEvent.change(input, { target: { value: "good@example.com" } });
    expect(screen.getByTestId("form-probe-error").textContent).toBe("");
    expect(input.value).toBe("good@example.com");
  });

  it("gates openUrl to host callback and blocks invalid actions", async () => {
    const onClientError = vi.fn();
    const onAction = vi.fn();
    const onHostEffect = vi.fn();
    let api: MessagesApi | undefined;

    render(
      <A2UIProvider
        componentsMap={componentsMap}
        onClientError={onClientError}
        onAction={onAction}
        onHostEffect={onHostEffect}
      >
        <RuntimeHarness onReady={(next) => (api = next)} />
      </A2UIProvider>
    );

    await waitFor(() => expect(api).toBeDefined());

    processMessage(api, {
      version: "v0.9",
      createSurface: { surfaceId: "s1" }
    });

    processMessage(api, {
      version: "v0.9",
      updateComponents: {
        surfaceId: "s1",
        components: [
          {
            id: "root",
            component: "ActionProbe",
            action: {
              event: "submit",
              openUrl: "https://example.com"
            },
            checks: [{ call: "required" }],
            valueForValidation: ""
          }
        ]
      }
    });

    const button = await screen.findByTestId("action-probe");
    fireEvent.click(button);

    expect(onAction).not.toHaveBeenCalled();
    expect(onHostEffect).not.toHaveBeenCalled();
    expect(onClientError).toHaveBeenCalledWith(
      expect.objectContaining({ code: "A2UI_VALIDATION_CHECK_FAILED" })
    );

    processMessage(api, {
      version: "v0.9",
      updateComponents: {
        surfaceId: "s1",
        components: [
          {
            id: "root",
            valueForValidation: "ok"
          } as Partial<A2UIComponent> & Pick<A2UIComponent, "id">
        ]
      }
    });

    fireEvent.click(button);

    expect(onAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action: expect.objectContaining({ event: "submit" })
      })
    );
    expect(onHostEffect).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "openUrl",
        url: "https://example.com"
      })
    );
  });

  it("supports relative scope resolution in ChildList template mode", async () => {
    let api: MessagesApi | undefined;

    render(
      <A2UIProvider componentsMap={componentsMap}>
        <RuntimeHarness onReady={(next) => (api = next)} />
      </A2UIProvider>
    );

    await waitFor(() => expect(api).toBeDefined());

    processMessage(api, {
      version: "v0.9",
      createSurface: { surfaceId: "s1" }
    });

    processMessage(api, {
      version: "v0.9",
      updateComponents: {
        surfaceId: "s1",
        components: [
          {
            id: "root",
            component: "ListProbe",
            itemsPath: "/items",
            template: {
              child: "itemText"
            }
          },
          {
            id: "itemText",
            component: "Text",
            text: {
              path: "./name"
            }
          }
        ]
      }
    });

    processMessage(api, {
      version: "v0.9",
      updateDataModel: {
        surfaceId: "s1",
        path: "/items",
        value: [{ name: "Alpha" }, { name: "Beta" }]
      }
    });

    expect(await screen.findByText("Alpha")).toBeTruthy();
    expect(await screen.findByText("Beta")).toBeTruthy();
  });
});
