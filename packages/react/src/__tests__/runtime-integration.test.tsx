import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { renderHook } from "@testing-library/react";
import { Runtime } from "@uiprotocol/core";
import type { Command, ProtocolAdapter, Surface, UINode } from "@uiprotocol/core";
import { RuntimeProvider } from "../provider";
import { SurfaceRenderer } from "../renderer";
import { useSurface } from "../hooks/useSurface";
import { useMessages } from "../hooks/useMessages";
import { useDataBinding } from "../hooks/useDataBinding";
import { useFormBinding } from "../hooks/useFormBinding";
import { useAction } from "../hooks/useAction";
import { useRuntimeContext, useSurfaceContext, RuntimeContext, SurfaceContext } from "../context";
import type { AdapterProps, ComponentsMap, RuntimeProviderProps } from "../types";

// ── Helpers ──

function createTestRuntime(): Runtime {
  return new Runtime();
}

function createSurface(runtime: Runtime, surfaceId: string): void {
  runtime.applySingle({
    type: "surface:create",
    surfaceId,
    timestamp: Date.now(),
    protocol: "test"
  });
}

function upsertNodes(
  runtime: Runtime,
  surfaceId: string,
  nodes: Array<Partial<UINode> & Pick<UINode, "id">>
): void {
  runtime.applySingle({
    type: "nodes:upsert",
    surfaceId,
    timestamp: Date.now(),
    nodes
  });
}

function setData(runtime: Runtime, surfaceId: string, path: string, value: unknown): void {
  runtime.applySingle({
    type: "data:set",
    surfaceId,
    timestamp: Date.now(),
    path,
    value
  });
}

// ── Components ──

function TextComponent({ node, resolve }: AdapterProps) {
  const content = resolve<string>(node.props.content as string);
  return <span data-testid={`node-${node.id}`}>{content ?? ""}</span>;
}

function ContainerComponent({ node, renderedChildren }: AdapterProps) {
  return <div data-testid={`node-${node.id}`}>{renderedChildren}</div>;
}

const testComponentsMap: ComponentsMap = {
  text: TextComponent,
  container: ContainerComponent
};

function TestProvider({
  children,
  runtime,
  ...props
}: Omit<RuntimeProviderProps, "children" | "componentsMap"> & {
  children: React.ReactNode;
  runtime?: Runtime;
  componentsMap?: ComponentsMap;
}) {
  const rt = runtime ?? createTestRuntime();
  return (
    <RuntimeContext.Provider
      value={{
        runtime: rt,
        componentsMap: props.componentsMap ?? testComponentsMap,
        ...props
      }}
    >
      {children}
    </RuntimeContext.Provider>
  );
}

// ── Context Tests ──

describe("Context", () => {
  it("useRuntimeContext throws outside RuntimeProvider", () => {
    expect(() => {
      renderHook(() => useRuntimeContext());
    }).toThrow("RuntimeProvider is required.");
  });

  it("useSurfaceContext throws outside SurfaceRenderer", () => {
    expect(() => {
      renderHook(() => useSurfaceContext(), {
        wrapper: ({ children }) => (
          <TestProvider>{children}</TestProvider>
        )
      });
    }).toThrow("SurfaceRenderer is required for surface-bound hooks.");
  });

  it("useRuntimeContext returns context inside RuntimeProvider", () => {
    const runtime = createTestRuntime();
    const { result } = renderHook(() => useRuntimeContext(), {
      wrapper: ({ children }) => (
        <RuntimeProvider componentsMap={testComponentsMap}>{children}</RuntimeProvider>
      )
    });

    expect(result.current.runtime).toBeInstanceOf(Runtime);
    expect(result.current.componentsMap).toBe(testComponentsMap);
  });
});

// ── RuntimeProvider Tests ──

describe("RuntimeProvider", () => {
  it("renders children", () => {
    render(
      <RuntimeProvider componentsMap={testComponentsMap}>
        <div data-testid="child">Hello</div>
      </RuntimeProvider>
    );

    expect(screen.getByTestId("child")).toBeTruthy();
    expect(screen.getByTestId("child").textContent).toBe("Hello");
  });

  it("passes callbacks to context", () => {
    const onAction = vi.fn();
    const onClientError = vi.fn();

    const { result } = renderHook(() => useRuntimeContext(), {
      wrapper: ({ children }) => (
        <RuntimeProvider
          componentsMap={testComponentsMap}
          onAction={onAction}
          onClientError={onClientError}
        >
          {children}
        </RuntimeProvider>
      )
    });

    expect(result.current.onAction).toBe(onAction);
    expect(result.current.onClientError).toBe(onClientError);
  });
});

// ── SurfaceRenderer Tests ──

describe("SurfaceRenderer", () => {
  let runtime: Runtime;

  beforeEach(() => {
    runtime = createTestRuntime();
  });

  it("renders fallback when surface does not exist", () => {
    render(
      <TestProvider runtime={runtime}>
        <SurfaceRenderer
          surfaceId="nonexistent"
          fallback={<div data-testid="fallback">Loading</div>}
        />
      </TestProvider>
    );

    expect(screen.getByTestId("fallback")).toBeTruthy();
  });

  it("renders default fallback when surface does not exist", () => {
    render(
      <TestProvider runtime={runtime}>
        <SurfaceRenderer surfaceId="nonexistent" />
      </TestProvider>
    );

    expect(document.querySelector("[data-uiprotocol-fallback]")).toBeTruthy();
  });

  it("renders fallback when surface has no root node", () => {
    createSurface(runtime, "s1");
    const onWarning = vi.fn();

    render(
      <TestProvider runtime={runtime} onWarning={onWarning}>
        <SurfaceRenderer
          surfaceId="s1"
          fallback={<div data-testid="fallback">No root</div>}
        />
      </TestProvider>
    );

    expect(screen.getByTestId("fallback")).toBeTruthy();
    expect(onWarning).toHaveBeenCalledWith(
      expect.objectContaining({
        code: "CORE_ROOT_MISSING",
        surfaceId: "s1"
      })
    );
  });

  it("renders a simple text node", () => {
    createSurface(runtime, "s1");
    upsertNodes(runtime, "s1", [
      { id: "root", type: "text", props: { content: "Hello World" } }
    ]);

    render(
      <TestProvider runtime={runtime}>
        <SurfaceRenderer surfaceId="s1" />
      </TestProvider>
    );

    expect(screen.getByTestId("node-root").textContent).toBe("Hello World");
  });

  it("renders nested nodes with children", () => {
    createSurface(runtime, "s1");
    upsertNodes(runtime, "s1", [
      { id: "root", type: "container", children: ["child1", "child2"], props: {} },
      { id: "child1", type: "text", props: { content: "First" } },
      { id: "child2", type: "text", props: { content: "Second" } }
    ]);

    render(
      <TestProvider runtime={runtime}>
        <SurfaceRenderer surfaceId="s1" />
      </TestProvider>
    );

    expect(screen.getByTestId("node-root")).toBeTruthy();
    expect(screen.getByTestId("node-child1").textContent).toBe("First");
    expect(screen.getByTestId("node-child2").textContent).toBe("Second");
  });

  it("shows unknown component for unmapped types", () => {
    createSurface(runtime, "s1");
    upsertNodes(runtime, "s1", [
      { id: "root", type: "nonexistent-widget", props: {} }
    ]);

    const onWarning = vi.fn();

    render(
      <TestProvider runtime={runtime} onWarning={onWarning}>
        <SurfaceRenderer surfaceId="s1" />
      </TestProvider>
    );

    expect(document.querySelector("[data-uiprotocol-unknown-component]")).toBeTruthy();
    expect(onWarning).toHaveBeenCalledWith(
      expect.objectContaining({
        code: "CORE_UNKNOWN_COMPONENT"
      })
    );
  });

  it("uses unknownComponentFallback when provided", () => {
    createSurface(runtime, "s1");
    upsertNodes(runtime, "s1", [
      { id: "root", type: "custom-widget", props: {} }
    ]);

    render(
      <TestProvider
        runtime={runtime}
        unknownComponentFallback={({ node }) => (
          <div data-testid="custom-fallback">{`Custom: ${node.type}`}</div>
        )}
      >
        <SurfaceRenderer surfaceId="s1" />
      </TestProvider>
    );

    expect(screen.getByTestId("custom-fallback").textContent).toBe("Custom: custom-widget");
  });

  it("shows missing node marker", () => {
    createSurface(runtime, "s1");
    upsertNodes(runtime, "s1", [
      { id: "root", type: "container", children: ["missing-child"], props: {} }
    ]);

    render(
      <TestProvider runtime={runtime}>
        <SurfaceRenderer surfaceId="s1" />
      </TestProvider>
    );

    expect(document.querySelector("[data-uiprotocol-missing-node]")).toBeTruthy();
  });

  it("resolves bound values from data model", () => {
    createSurface(runtime, "s1");
    setData(runtime, "s1", "/greeting", "Hi there");
    upsertNodes(runtime, "s1", [
      { id: "root", type: "text", props: { content: { path: "/greeting" } } }
    ]);

    render(
      <TestProvider runtime={runtime}>
        <SurfaceRenderer surfaceId="s1" />
      </TestProvider>
    );

    expect(screen.getByTestId("node-root").textContent).toBe("Hi there");
  });

  it("dispatches actions via component props", () => {
    createSurface(runtime, "s1");
    upsertNodes(runtime, "s1", [
      { id: "root", type: "text", props: { content: "Click me" } }
    ]);

    const onAction = vi.fn();

    // Create a button component that dispatches an action
    function ButtonComponent({ node, dispatchAction }: AdapterProps) {
      return (
        <button
          data-testid={`node-${node.id}`}
          onClick={() => dispatchAction({ event: "click" })}
        >
          {String(node.props.content ?? "")}
        </button>
      );
    }

    render(
      <TestProvider runtime={runtime} onAction={onAction} componentsMap={{ ...testComponentsMap, text: ButtonComponent }}>
        <SurfaceRenderer surfaceId="s1" />
      </TestProvider>
    );

    act(() => {
      screen.getByTestId("node-root").click();
    });

    expect(onAction).toHaveBeenCalledWith(
      expect.objectContaining({
        surfaceId: "s1",
        nodeId: "root",
        action: { event: "click" }
      })
    );
  });

  it("handles openUrl host effect", () => {
    createSurface(runtime, "s1");
    upsertNodes(runtime, "s1", [
      { id: "root", type: "text", props: { content: "Link" } }
    ]);

    const onHostEffect = vi.fn();
    const onAction = vi.fn();

    function LinkComponent({ node, dispatchAction }: AdapterProps) {
      return (
        <a
          data-testid={`node-${node.id}`}
          onClick={() => dispatchAction({ event: "click", openUrl: "https://example.com" })}
        >
          {String(node.props.content ?? "")}
        </a>
      );
    }

    render(
      <TestProvider
        runtime={runtime}
        onAction={onAction}
        onHostEffect={onHostEffect}
        componentsMap={{ ...testComponentsMap, text: LinkComponent }}
      >
        <SurfaceRenderer surfaceId="s1" />
      </TestProvider>
    );

    act(() => {
      screen.getByTestId("node-root").click();
    });

    expect(onHostEffect).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "openUrl",
        url: "https://example.com",
        surfaceId: "s1",
        nodeId: "root"
      })
    );
    expect(onAction).toHaveBeenCalled();
  });

  it("warns when openUrl has no onHostEffect handler", () => {
    createSurface(runtime, "s1");
    upsertNodes(runtime, "s1", [
      { id: "root", type: "text", props: { content: "Link" } }
    ]);

    const onWarning = vi.fn();
    const onAction = vi.fn();

    function LinkComponent({ node, dispatchAction }: AdapterProps) {
      return (
        <a
          data-testid={`node-${node.id}`}
          onClick={() => dispatchAction({ event: "click", openUrl: "https://example.com" })}
        >
          {String(node.props.content ?? "")}
        </a>
      );
    }

    render(
      <TestProvider
        runtime={runtime}
        onWarning={onWarning}
        onAction={onAction}
        componentsMap={{ ...testComponentsMap, text: LinkComponent }}
      >
        <SurfaceRenderer surfaceId="s1" />
      </TestProvider>
    );

    act(() => {
      screen.getByTestId("node-root").click();
    });

    expect(onWarning).toHaveBeenCalledWith(
      expect.objectContaining({
        code: "CORE_HOST_EFFECT_DROPPED"
      })
    );
  });

  it("setData applies data:set commands through runtime", () => {
    createSurface(runtime, "s1");
    setData(runtime, "s1", "/value", "initial");
    upsertNodes(runtime, "s1", [
      { id: "root", type: "text", props: { content: "test" } }
    ]);

    function InputComponent({ node, setData: sd }: AdapterProps) {
      return (
        <button
          data-testid={`node-${node.id}`}
          onClick={() => sd("/value", "updated")}
        >
          Update
        </button>
      );
    }

    render(
      <TestProvider runtime={runtime} componentsMap={{ ...testComponentsMap, text: InputComponent }}>
        <SurfaceRenderer surfaceId="s1" />
      </TestProvider>
    );

    act(() => {
      screen.getByTestId("node-root").click();
    });

    const surface = runtime.getSurface("s1");
    expect((surface?.dataModel as Record<string, unknown>).value).toBe("updated");
  });

  it("setData with omitValue applies data:remove command", () => {
    createSurface(runtime, "s1");
    setData(runtime, "s1", "/toRemove", "exists");
    upsertNodes(runtime, "s1", [
      { id: "root", type: "text", props: { content: "test" } }
    ]);

    function RemoveComponent({ node, setData: sd }: AdapterProps) {
      return (
        <button
          data-testid={`node-${node.id}`}
          onClick={() => sd("/toRemove", undefined, { omitValue: true })}
        >
          Remove
        </button>
      );
    }

    render(
      <TestProvider runtime={runtime} componentsMap={{ ...testComponentsMap, text: RemoveComponent }}>
        <SurfaceRenderer surfaceId="s1" />
      </TestProvider>
    );

    act(() => {
      screen.getByTestId("node-root").click();
    });

    const surface = runtime.getSurface("s1");
    expect((surface?.dataModel as Record<string, unknown>).toRemove).toBeUndefined();
  });

  it("reports error for invalid action (missing event)", () => {
    createSurface(runtime, "s1");
    upsertNodes(runtime, "s1", [
      { id: "root", type: "text", props: { content: "test" } }
    ]);

    const onClientError = vi.fn();

    function BadActionComponent({ node, dispatchAction }: AdapterProps) {
      return (
        <button
          data-testid={`node-${node.id}`}
          onClick={() => dispatchAction({ event: "" })}
        >
          Bad
        </button>
      );
    }

    render(
      <TestProvider
        runtime={runtime}
        onClientError={onClientError}
        componentsMap={{ ...testComponentsMap, text: BadActionComponent }}
      >
        <SurfaceRenderer surfaceId="s1" />
      </TestProvider>
    );

    act(() => {
      screen.getByTestId("node-root").click();
    });

    expect(onClientError).toHaveBeenCalledWith(
      expect.objectContaining({
        code: "CORE_INVALID_ENVELOPE",
        message: "Action event is required."
      })
    );
  });
});

// ── useSurface Tests ──

describe("useSurface", () => {
  it("returns surface data when surface exists", () => {
    const runtime = createTestRuntime();
    createSurface(runtime, "s1");
    upsertNodes(runtime, "s1", [
      { id: "root", type: "text", props: { content: "Hello" } }
    ]);

    const { result } = renderHook(() => useSurface("s1"), {
      wrapper: ({ children }) => <TestProvider runtime={runtime}>{children}</TestProvider>
    });

    expect(result.current.surface).toBeDefined();
    expect(result.current.surface?.id).toBe("s1");
    expect(result.current.nodes?.get("root")?.type).toBe("text");
    expect(result.current.isReady).toBe(true);
  });

  it("returns undefined surface when not found", () => {
    const runtime = createTestRuntime();

    const { result } = renderHook(() => useSurface("nonexistent"), {
      wrapper: ({ children }) => <TestProvider runtime={runtime}>{children}</TestProvider>
    });

    expect(result.current.surface).toBeUndefined();
    expect(result.current.isReady).toBe(false);
  });

  it("reacts to runtime changes", () => {
    const runtime = createTestRuntime();

    const { result } = renderHook(() => useSurface("s1"), {
      wrapper: ({ children }) => <TestProvider runtime={runtime}>{children}</TestProvider>
    });

    expect(result.current.surface).toBeUndefined();

    act(() => {
      createSurface(runtime, "s1");
      upsertNodes(runtime, "s1", [
        { id: "root", type: "text", props: { content: "Added" } }
      ]);
    });

    expect(result.current.surface).toBeDefined();
    expect(result.current.isReady).toBe(true);
  });
});

// ── useMessages Tests ──

describe("useMessages", () => {
  const mockAdapter: ProtocolAdapter = {
    protocol: "test",
    parse(raw: unknown) {
      const msg = raw as { type: string; surfaceId: string; [k: string]: unknown };
      if (msg.type === "create") {
        return {
          ok: true as const,
          value: [{
            type: "surface:create" as const,
            surfaceId: msg.surfaceId,
            timestamp: Date.now(),
            protocol: "test"
          }],
          warnings: []
        };
      }
      return {
        ok: false as const,
        errors: [{
          code: "TEST_ERROR",
          message: "Unknown message type",
          severity: "error" as const
        }],
        warnings: []
      };
    }
  };

  it("processes a valid message", () => {
    const runtime = createTestRuntime();

    const { result } = renderHook(() => useMessages(mockAdapter), {
      wrapper: ({ children }) => <TestProvider runtime={runtime}>{children}</TestProvider>
    });

    act(() => {
      const res = result.current.processMessage({ type: "create", surfaceId: "s1" });
      expect(res.parseResult.ok).toBe(true);
      expect(res.applyResult?.ok).toBe(true);
    });

    expect(result.current.surfaces).toHaveLength(1);
  });

  it("reports parse errors to onClientError", () => {
    const runtime = createTestRuntime();
    const onClientError = vi.fn();

    const { result } = renderHook(() => useMessages(mockAdapter), {
      wrapper: ({ children }) => (
        <TestProvider runtime={runtime} onClientError={onClientError}>
          {children}
        </TestProvider>
      )
    });

    act(() => {
      result.current.processMessage({ type: "invalid" });
    });

    expect(onClientError).toHaveBeenCalledWith(
      expect.objectContaining({
        code: "TEST_ERROR",
        message: "Unknown message type"
      })
    );
  });

  it("processes batch messages from array", () => {
    const runtime = createTestRuntime();

    const { result } = renderHook(() => useMessages(mockAdapter), {
      wrapper: ({ children }) => <TestProvider runtime={runtime}>{children}</TestProvider>
    });

    act(() => {
      const results = result.current.processMessages([
        { type: "create", surfaceId: "s1" },
        { type: "create", surfaceId: "s2" }
      ]);
      expect(results).toHaveLength(2);
      expect(results[0].parseResult.ok).toBe(true);
      expect(results[1].parseResult.ok).toBe(true);
    });

    expect(result.current.surfaces).toHaveLength(2);
  });
});

// ── useDataBinding Tests ──

describe("useDataBinding", () => {
  it("reads and writes data values", () => {
    const runtime = createTestRuntime();
    createSurface(runtime, "s1");
    setData(runtime, "s1", "/name", "Alice");

    const { result } = renderHook(() => useDataBinding("/name"), {
      wrapper: ({ children }) => (
        <TestProvider runtime={runtime}>
          <SurfaceContext.Provider value={{ surfaceId: "s1", scopePath: "/" }}>
            {children}
          </SurfaceContext.Provider>
        </TestProvider>
      )
    });

    expect(result.current.path).toBe("/name");
    expect(result.current.value).toBe("Alice");

    act(() => {
      result.current.setValue("Bob");
    });

    expect(result.current.value).toBe("Bob");
  });

  it("handles remove option", () => {
    const runtime = createTestRuntime();
    createSurface(runtime, "s1");
    setData(runtime, "s1", "/temp", "exists");

    const { result } = renderHook(() => useDataBinding("/temp"), {
      wrapper: ({ children }) => (
        <TestProvider runtime={runtime}>
          <SurfaceContext.Provider value={{ surfaceId: "s1", scopePath: "/" }}>
            {children}
          </SurfaceContext.Provider>
        </TestProvider>
      )
    });

    expect(result.current.value).toBe("exists");

    act(() => {
      result.current.setValue(undefined, { remove: true });
    });

    expect(result.current.value).toBeUndefined();
  });

  it("resolves relative paths against scope", () => {
    const runtime = createTestRuntime();
    createSurface(runtime, "s1");
    setData(runtime, "s1", "/items/0/name", "Item Zero");

    const { result } = renderHook(() => useDataBinding("name"), {
      wrapper: ({ children }) => (
        <TestProvider runtime={runtime}>
          <SurfaceContext.Provider value={{ surfaceId: "s1", scopePath: "/items/0" }}>
            {children}
          </SurfaceContext.Provider>
        </TestProvider>
      )
    });

    expect(result.current.path).toBe("/items/0/name");
    expect(result.current.value).toBe("Item Zero");
  });
});

// ── useFormBinding Tests ──

describe("useFormBinding", () => {
  it("validates and sets value on onChange", () => {
    const runtime = createTestRuntime();
    createSurface(runtime, "s1");
    setData(runtime, "s1", "/email", "");

    const { result } = renderHook(
      () => useFormBinding({ path: "/email", pattern: "^.+@.+\\..+$" }),
      {
        wrapper: ({ children }) => (
          <TestProvider runtime={runtime}>
            <SurfaceContext.Provider value={{ surfaceId: "s1", scopePath: "/" }}>
              {children}
            </SurfaceContext.Provider>
          </TestProvider>
        )
      }
    );

    // Invalid value
    act(() => {
      const res = result.current.onChange("notanemail");
      expect(res.ok).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.value).toBe(""); // unchanged

    // Valid value
    act(() => {
      const res = result.current.onChange("test@example.com");
      expect(res.ok).toBe(true);
    });

    expect(result.current.error).toBeNull();
    expect(result.current.value).toBe("test@example.com");
  });

  it("reports validation errors to onClientError", () => {
    const runtime = createTestRuntime();
    createSurface(runtime, "s1");
    setData(runtime, "s1", "/field", "");

    const onClientError = vi.fn();

    const { result } = renderHook(
      () => useFormBinding({
        path: "/field",
        checks: [{ call: "required" }]
      }),
      {
        wrapper: ({ children }) => (
          <TestProvider runtime={runtime} onClientError={onClientError}>
            <SurfaceContext.Provider value={{ surfaceId: "s1", scopePath: "/" }}>
              {children}
            </SurfaceContext.Provider>
          </TestProvider>
        )
      }
    );

    act(() => {
      result.current.validate("");
    });

    expect(onClientError).toHaveBeenCalled();
    expect(result.current.error).toBeTruthy();
  });

  it("allows setValue without validation", () => {
    const runtime = createTestRuntime();
    createSurface(runtime, "s1");
    setData(runtime, "s1", "/field", "");

    const { result } = renderHook(
      () => useFormBinding({ path: "/field", pattern: "^[A-Z]+$" }),
      {
        wrapper: ({ children }) => (
          <TestProvider runtime={runtime}>
            <SurfaceContext.Provider value={{ surfaceId: "s1", scopePath: "/" }}>
              {children}
            </SurfaceContext.Provider>
          </TestProvider>
        )
      }
    );

    // setValue bypasses validation
    act(() => {
      result.current.setValue("lowercase");
    });

    expect(result.current.value).toBe("lowercase");
  });
});

// ── useAction Tests ──

describe("useAction", () => {
  it("dispatches action with surface context", () => {
    const runtime = createTestRuntime();
    createSurface(runtime, "s1");
    const onAction = vi.fn();

    const { result } = renderHook(() => useAction(), {
      wrapper: ({ children }) => (
        <TestProvider runtime={runtime} onAction={onAction}>
          <SurfaceContext.Provider value={{ surfaceId: "s1", scopePath: "/" }}>
            {children}
          </SurfaceContext.Provider>
        </TestProvider>
      )
    });

    act(() => {
      const success = result.current({ event: "submit" });
      expect(success).toBe(true);
    });

    expect(onAction).toHaveBeenCalledWith(
      expect.objectContaining({
        surfaceId: "s1",
        action: { event: "submit" }
      })
    );
  });

  it("returns false for missing surface", () => {
    const runtime = createTestRuntime();
    const onClientError = vi.fn();

    const { result } = renderHook(() => useAction(), {
      wrapper: ({ children }) => (
        <TestProvider runtime={runtime} onClientError={onClientError}>
          <SurfaceContext.Provider value={{ surfaceId: "nonexistent", scopePath: "/" }}>
            {children}
          </SurfaceContext.Provider>
        </TestProvider>
      )
    });

    act(() => {
      const success = result.current({ event: "click" });
      expect(success).toBe(false);
    });

    expect(onClientError).toHaveBeenCalledWith(
      expect.objectContaining({
        code: "CORE_SURFACE_NOT_FOUND"
      })
    );
  });

  it("returns false for invalid action event", () => {
    const runtime = createTestRuntime();
    createSurface(runtime, "s1");
    const onClientError = vi.fn();

    const { result } = renderHook(() => useAction(), {
      wrapper: ({ children }) => (
        <TestProvider runtime={runtime} onClientError={onClientError}>
          <SurfaceContext.Provider value={{ surfaceId: "s1", scopePath: "/" }}>
            {children}
          </SurfaceContext.Provider>
        </TestProvider>
      )
    });

    act(() => {
      const success = result.current({ event: "" });
      expect(success).toBe(false);
    });

    expect(onClientError).toHaveBeenCalledWith(
      expect.objectContaining({
        code: "CORE_INVALID_ENVELOPE",
        message: "Action event is required."
      })
    );
  });

  it("handles openUrl host effect", () => {
    const runtime = createTestRuntime();
    createSurface(runtime, "s1");
    const onHostEffect = vi.fn();

    const { result } = renderHook(() => useAction(), {
      wrapper: ({ children }) => (
        <TestProvider runtime={runtime} onHostEffect={onHostEffect} onAction={vi.fn()}>
          <SurfaceContext.Provider value={{ surfaceId: "s1", scopePath: "/" }}>
            {children}
          </SurfaceContext.Provider>
        </TestProvider>
      )
    });

    act(() => {
      result.current({ event: "navigate", openUrl: "https://example.com" });
    });

    expect(onHostEffect).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "openUrl",
        url: "https://example.com",
        surfaceId: "s1"
      })
    );
  });

  it("validates with checks before dispatching", () => {
    const runtime = createTestRuntime();
    createSurface(runtime, "s1");
    const onClientError = vi.fn();
    const onAction = vi.fn();

    const { result } = renderHook(() => useAction(), {
      wrapper: ({ children }) => (
        <TestProvider runtime={runtime} onClientError={onClientError} onAction={onAction}>
          <SurfaceContext.Provider value={{ surfaceId: "s1", scopePath: "/" }}>
            {children}
          </SurfaceContext.Provider>
        </TestProvider>
      )
    });

    act(() => {
      const success = result.current(
        { event: "submit" },
        { checks: [{ call: "required" }], value: "" }
      );
      expect(success).toBe(false);
    });

    expect(onAction).not.toHaveBeenCalled();
    expect(onClientError).toHaveBeenCalled();
  });
});
