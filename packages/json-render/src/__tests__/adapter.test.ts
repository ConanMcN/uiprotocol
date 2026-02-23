import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { JsonRenderAdapter } from "../adapter";
import type {
  SurfaceCreateCommand,
  NodesUpsertCommand,
  DataSetCommand
} from "@uiprotocol/core";

describe("JsonRenderAdapter", () => {
  let adapter: JsonRenderAdapter;
  let dateSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    adapter = new JsonRenderAdapter();
    dateSpy = vi.spyOn(Date, "now").mockReturnValue(1000);
  });

  afterEach(() => {
    dateSpy.mockRestore();
  });

  it("has protocol set to json-render", () => {
    expect(adapter.protocol).toBe("json-render");
  });

  it("produces surface:create + nodes:upsert for a basic spec", () => {
    const result = adapter.parse({
      surfaceId: "test-surface",
      root: { type: "text", content: "Hello" }
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value).toHaveLength(2);

    const surfaceCmd = result.value[0] as SurfaceCreateCommand;
    expect(surfaceCmd.type).toBe("surface:create");
    expect(surfaceCmd.surfaceId).toBe("test-surface");
    expect(surfaceCmd.protocol).toBe("json-render");
    expect(surfaceCmd.timestamp).toBe(1000);

    const nodesCmd = result.value[1] as NodesUpsertCommand;
    expect(nodesCmd.type).toBe("nodes:upsert");
    expect(nodesCmd.surfaceId).toBe("test-surface");
    expect(nodesCmd.nodes).toHaveLength(1);
    expect(nodesCmd.nodes[0].id).toBe("root");
    expect(nodesCmd.nodes[0].type).toBe("text");
    expect(nodesCmd.nodes[0].props).toEqual({ content: "Hello" });
  });

  it("generates a synthetic surfaceId when not provided", () => {
    const result = adapter.parse({
      root: { type: "text" }
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const surfaceCmd = result.value[0] as SurfaceCreateCommand;
    expect(surfaceCmd.surfaceId).toBe("jr-1000");
  });

  it("produces a data:set command when state is provided", () => {
    const result = adapter.parse({
      surfaceId: "s1",
      state: { count: 0, name: "test" },
      root: { type: "text" }
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value).toHaveLength(3);

    const dataCmd = result.value[2] as DataSetCommand;
    expect(dataCmd.type).toBe("data:set");
    expect(dataCmd.surfaceId).toBe("s1");
    expect(dataCmd.path).toBe("/");
    expect(dataCmd.value).toEqual({ count: 0, name: "test" });
  });

  it("flattens children correctly with generated IDs", () => {
    const result = adapter.parse({
      surfaceId: "s1",
      root: {
        type: "container",
        children: [
          { type: "text", content: "A" },
          { type: "text", content: "B" }
        ]
      }
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const nodesCmd = result.value[1] as NodesUpsertCommand;
    // 3 nodes: two children + root
    expect(nodesCmd.nodes).toHaveLength(3);

    // Children are flattened first (depth-first)
    const child0 = nodesCmd.nodes[0];
    expect(child0.id).toBe("node-0");
    expect(child0.type).toBe("text");
    expect(child0.props).toEqual({ content: "A" });

    const child1 = nodesCmd.nodes[1];
    expect(child1.id).toBe("node-1");
    expect(child1.type).toBe("text");
    expect(child1.props).toEqual({ content: "B" });

    // Root references children
    const rootNode = nodesCmd.nodes[2];
    expect(rootNode.id).toBe("root");
    expect(rootNode.type).toBe("container");
    expect(rootNode.children).toEqual(["node-0", "node-1"]);
  });

  it("preserves explicit child IDs", () => {
    const result = adapter.parse({
      surfaceId: "s1",
      root: {
        type: "container",
        children: [
          { type: "text", id: "my-text", content: "Hello" }
        ]
      }
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const nodesCmd = result.value[1] as NodesUpsertCommand;
    expect(nodesCmd.nodes[0].id).toBe("my-text");
    expect(nodesCmd.nodes[1].children).toEqual(["my-text"]);
  });

  it("translates $state expressions to BoundValue", () => {
    const result = adapter.parse({
      surfaceId: "s1",
      root: {
        type: "text",
        content: { $state: "/message" }
      }
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const nodesCmd = result.value[1] as NodesUpsertCommand;
    expect(nodesCmd.nodes[0].props).toEqual({
      content: { path: "/message" }
    });
  });

  it("translates $cond expressions to FunctionCall", () => {
    const result = adapter.parse({
      surfaceId: "s1",
      root: {
        type: "text",
        content: { $cond: "format", args: { value: { $state: "/count" } } }
      }
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const nodesCmd = result.value[1] as NodesUpsertCommand;
    expect(nodesCmd.nodes[0].props).toEqual({
      content: { call: "format", args: { value: { path: "/count" } } }
    });
  });

  it("translates visibility conditions to __visible prop", () => {
    const result = adapter.parse({
      surfaceId: "s1",
      root: {
        type: "text",
        visible: { $cond: "isLoggedIn" }
      }
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const nodesCmd = result.value[1] as NodesUpsertCommand;
    expect(nodesCmd.nodes[0].props).toEqual({
      __visible: { call: "isLoggedIn" }
    });
  });

  it("translates visibility condition with args", () => {
    const result = adapter.parse({
      surfaceId: "s1",
      root: {
        type: "text",
        visible: { $cond: "hasRole", args: { role: "admin" } }
      }
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const nodesCmd = result.value[1] as NodesUpsertCommand;
    expect(nodesCmd.nodes[0].props!.__visible).toEqual({
      call: "hasRole",
      args: { role: "admin" }
    });
  });

  it("returns parse error for non-object input", () => {
    const result = adapter.parse("invalid");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors[0].code).toBe("CORE_INVALID_ENVELOPE");
  });

  it("returns parse error for null input", () => {
    const result = adapter.parse(null);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors[0].code).toBe("CORE_INVALID_ENVELOPE");
  });

  it("returns parse error when root is missing", () => {
    const result = adapter.parse({ surfaceId: "s1" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors[0].code).toBe("CORE_MISSING_FIELD");
  });

  it("returns parse error when root is not an object", () => {
    const result = adapter.parse({ root: "not-an-object" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors[0].code).toBe("CORE_MISSING_FIELD");
  });
});
