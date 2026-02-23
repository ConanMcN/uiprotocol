import { describe, expect, it, vi } from "vitest";
import { Runtime } from "../runtime";
import type { Command, UINode } from "../types";

function ts(): number {
  return Date.now();
}

describe("Runtime", () => {
  describe("surface lifecycle", () => {
    it("creates a surface", () => {
      const runtime = new Runtime();
      const result = runtime.applySingle({
        type: "surface:create",
        surfaceId: "s1",
        timestamp: ts(),
        protocol: "test"
      });
      expect(result.ok).toBe(true);
      expect(runtime.getSurface("s1")).toBeDefined();
      expect(runtime.getSurface("s1")!.protocol).toBe("test");
    });

    it("deletes a surface", () => {
      const runtime = new Runtime();
      runtime.applySingle({
        type: "surface:create",
        surfaceId: "s1",
        timestamp: ts(),
        protocol: "test"
      });
      const result = runtime.applySingle({
        type: "surface:delete",
        surfaceId: "s1",
        timestamp: ts()
      });
      expect(result.ok).toBe(true);
      expect(runtime.getSurface("s1")).toBeUndefined();
    });

    it("warns when deleting non-existent surface", () => {
      const runtime = new Runtime();
      const result = runtime.applySingle({
        type: "surface:delete",
        surfaceId: "nope",
        timestamp: ts()
      });
      expect(result.ok).toBe(true);
      expect(result.diagnostics).toHaveLength(1);
      expect(result.diagnostics[0].severity).toBe("warning");
    });
  });

  describe("nodes:upsert", () => {
    it("creates nodes via upsert", () => {
      const runtime = new Runtime();
      runtime.applySingle({
        type: "surface:create",
        surfaceId: "s1",
        timestamp: ts(),
        protocol: "test"
      });
      const result = runtime.applySingle({
        type: "nodes:upsert",
        surfaceId: "s1",
        timestamp: ts(),
        nodes: [
          { id: "root", type: "Container", props: { label: "hi" }, children: ["child1"] },
          { id: "child1", type: "Text", props: { content: "hello" } }
        ]
      });
      expect(result.ok).toBe(true);
      const surface = runtime.getSurface("s1")!;
      expect(surface.nodes.get("root")?.type).toBe("Container");
      expect(surface.nodes.get("root")?.props.label).toBe("hi");
      expect(surface.nodes.get("child1")?.type).toBe("Text");
    });

    it("merges patches on existing nodes", () => {
      const runtime = new Runtime();
      runtime.applySingle({ type: "surface:create", surfaceId: "s1", timestamp: ts(), protocol: "test" });
      runtime.applySingle({
        type: "nodes:upsert",
        surfaceId: "s1",
        timestamp: ts(),
        nodes: [{ id: "root", type: "Text", props: { label: "old", color: "red" } }]
      });
      runtime.applySingle({
        type: "nodes:upsert",
        surfaceId: "s1",
        timestamp: ts(),
        nodes: [{ id: "root", props: { label: "new" } }]
      });
      const node = runtime.getSurface("s1")!.nodes.get("root")!;
      expect(node.type).toBe("Text");
      expect(node.props.label).toBe("new");
      expect(node.props.color).toBe("red");
    });

    it("prunes unreachable nodes", () => {
      const runtime = new Runtime();
      runtime.applySingle({ type: "surface:create", surfaceId: "s1", timestamp: ts(), protocol: "test" });
      runtime.applySingle({
        type: "nodes:upsert",
        surfaceId: "s1",
        timestamp: ts(),
        nodes: [
          { id: "root", type: "Container", props: {}, children: ["a"] },
          { id: "a", type: "Text", props: {} },
          { id: "orphan", type: "Text", props: {} }
        ]
      });
      const surface = runtime.getSurface("s1")!;
      expect(surface.nodes.has("root")).toBe(true);
      expect(surface.nodes.has("a")).toBe(true);
      expect(surface.nodes.has("orphan")).toBe(false);
    });

    it("errors when surface not found", () => {
      const runtime = new Runtime();
      const result = runtime.applySingle({
        type: "nodes:upsert",
        surfaceId: "nope",
        timestamp: ts(),
        nodes: [{ id: "root", type: "Text", props: {} }]
      });
      expect(result.ok).toBe(false);
    });

    it("reports missing node type", () => {
      const runtime = new Runtime();
      runtime.applySingle({ type: "surface:create", surfaceId: "s1", timestamp: ts(), protocol: "test" });
      const result = runtime.applySingle({
        type: "nodes:upsert",
        surfaceId: "s1",
        timestamp: ts(),
        nodes: [{ id: "root", props: {} } as Partial<UINode> & Pick<UINode, "id">]
      });
      expect(result.diagnostics.some(d => d.code === "CORE_MISSING_NODE_TYPE")).toBe(true);
    });
  });

  describe("nodes:remove", () => {
    it("removes nodes by id", () => {
      const runtime = new Runtime();
      runtime.applySingle({ type: "surface:create", surfaceId: "s1", timestamp: ts(), protocol: "test" });
      runtime.applySingle({
        type: "nodes:upsert",
        surfaceId: "s1",
        timestamp: ts(),
        nodes: [
          { id: "root", type: "Container", props: {}, children: ["a"] },
          { id: "a", type: "Text", props: {} }
        ]
      });
      runtime.applySingle({
        type: "nodes:remove",
        surfaceId: "s1",
        timestamp: ts(),
        nodeIds: ["a"]
      });
      expect(runtime.getSurface("s1")!.nodes.has("a")).toBe(false);
    });
  });

  describe("data commands", () => {
    it("sets data at a path", () => {
      const runtime = new Runtime();
      runtime.applySingle({ type: "surface:create", surfaceId: "s1", timestamp: ts(), protocol: "test" });
      runtime.applySingle({
        type: "data:set",
        surfaceId: "s1",
        timestamp: ts(),
        path: "/name",
        value: "Alice"
      });
      expect((runtime.getSurface("s1")!.dataModel as Record<string, unknown>).name).toBe("Alice");
    });

    it("removes data at a path", () => {
      const runtime = new Runtime();
      runtime.applySingle({ type: "surface:create", surfaceId: "s1", timestamp: ts(), protocol: "test" });
      runtime.applySingle({
        type: "data:set",
        surfaceId: "s1",
        timestamp: ts(),
        path: "/name",
        value: "Alice"
      });
      runtime.applySingle({
        type: "data:remove",
        surfaceId: "s1",
        timestamp: ts(),
        path: "/name"
      });
      expect((runtime.getSurface("s1")!.dataModel as Record<string, unknown>).name).toBeUndefined();
    });
  });

  describe("subscription", () => {
    it("notifies listeners on changes", () => {
      const runtime = new Runtime();
      const listener = vi.fn();
      runtime.subscribe(listener);
      runtime.applySingle({ type: "surface:create", surfaceId: "s1", timestamp: ts(), protocol: "test" });
      expect(listener).toHaveBeenCalled();
    });

    it("unsubscribe stops notifications", () => {
      const runtime = new Runtime();
      const listener = vi.fn();
      const unsub = runtime.subscribe(listener);
      unsub();
      runtime.applySingle({ type: "surface:create", surfaceId: "s1", timestamp: ts(), protocol: "test" });
      expect(listener).not.toHaveBeenCalled();
    });

    it("increments revision on changes", () => {
      const runtime = new Runtime();
      expect(runtime.getRevision()).toBe(0);
      runtime.applySingle({ type: "surface:create", surfaceId: "s1", timestamp: ts(), protocol: "test" });
      expect(runtime.getRevision()).toBe(1);
    });
  });

  describe("events", () => {
    it("emits command:before and command events", () => {
      const runtime = new Runtime();
      const before = vi.fn();
      const after = vi.fn();
      runtime.events.on("command:before", before);
      runtime.events.on("command", after);
      runtime.applySingle({ type: "surface:create", surfaceId: "s1", timestamp: ts(), protocol: "test" });
      expect(before).toHaveBeenCalled();
      expect(after).toHaveBeenCalled();
    });

    it("emits trust:blocked when command is rejected", () => {
      const runtime = new Runtime({
        trustPolicy: { requireConsent: ["DangerousWidget"] }
      });
      const blocked = vi.fn();
      runtime.events.on("trust:blocked", blocked);
      runtime.applySingle({
        type: "nodes:upsert",
        surfaceId: "s1",
        timestamp: ts(),
        nodes: [{ id: "root", type: "DangerousWidget", props: {} }]
      });
      expect(blocked).toHaveBeenCalled();
    });
  });

  describe("trust", () => {
    it("blocks commands based on trust policy", () => {
      const runtime = new Runtime({
        trustPolicy: { requireConsent: ["PaymentForm"] }
      });
      runtime.applySingle({ type: "surface:create", surfaceId: "s1", timestamp: ts(), protocol: "test" });
      const result = runtime.applySingle({
        type: "nodes:upsert",
        surfaceId: "s1",
        timestamp: ts(),
        nodes: [{ id: "root", type: "PaymentForm", props: {} }]
      });
      expect(result.ok).toBe(false);
      expect(result.diagnostics[0].code).toBe("CORE_TRUST_VIOLATION");
    });

    it("logs rejected commands to command log", () => {
      const runtime = new Runtime({
        trustPolicy: { requireConsent: ["Scary"] }
      });
      runtime.applySingle({
        type: "nodes:upsert",
        surfaceId: "s1",
        timestamp: ts(),
        nodes: [{ id: "root", type: "Scary", props: {} }]
      });
      expect(runtime.commandLog.getRejected()).toHaveLength(1);
    });
  });

  describe("apply()", () => {
    it("processes multiple commands", () => {
      const runtime = new Runtime();
      const result = runtime.apply([
        { type: "surface:create", surfaceId: "s1", timestamp: ts(), protocol: "test" },
        { type: "nodes:upsert", surfaceId: "s1", timestamp: ts(), nodes: [{ id: "root", type: "Text", props: {} }] }
      ]);
      expect(result.ok).toBe(true);
      expect(runtime.getSurface("s1")!.nodes.has("root")).toBe(true);
    });
  });

  describe("processMessage()", () => {
    it("parses and applies via adapter", () => {
      const runtime = new Runtime();
      const adapter = {
        protocol: "test",
        parse: () => ({
          ok: true as const,
          value: [
            { type: "surface:create" as const, surfaceId: "s1", timestamp: ts(), protocol: "test" }
          ],
          warnings: []
        })
      };
      const result = runtime.processMessage(adapter, {});
      expect(result.parseResult.ok).toBe(true);
      expect(result.applyResult?.ok).toBe(true);
      expect(runtime.getSurface("s1")).toBeDefined();
    });

    it("returns parse errors without applying", () => {
      const runtime = new Runtime();
      const adapter = {
        protocol: "test",
        parse: () => ({
          ok: false as const,
          errors: [{ code: "ERR", message: "bad", severity: "error" as const }],
          warnings: []
        })
      };
      const result = runtime.processMessage(adapter, {});
      expect(result.parseResult.ok).toBe(false);
      expect(result.applyResult).toBeUndefined();
    });
  });

  describe("child ref collector", () => {
    it("uses custom collector for protocol", () => {
      const runtime = new Runtime();
      runtime.setChildRefCollector("custom", (node) => {
        const refs: string[] = [];
        if (node.props.myChild && typeof node.props.myChild === "string") {
          refs.push(node.props.myChild);
        }
        return refs;
      });

      runtime.applySingle({ type: "surface:create", surfaceId: "s1", timestamp: ts(), protocol: "custom" });
      runtime.applySingle({
        type: "nodes:upsert",
        surfaceId: "s1",
        timestamp: ts(),
        nodes: [
          { id: "root", type: "Container", props: { myChild: "kept" } },
          { id: "kept", type: "Text", props: {} },
          { id: "orphan", type: "Text", props: {} }
        ]
      });

      const surface = runtime.getSurface("s1")!;
      expect(surface.nodes.has("kept")).toBe(true);
      expect(surface.nodes.has("orphan")).toBe(false);
    });
  });

  describe("getSurfaces()", () => {
    it("returns all surfaces", () => {
      const runtime = new Runtime();
      runtime.applySingle({ type: "surface:create", surfaceId: "s1", timestamp: ts(), protocol: "test" });
      runtime.applySingle({ type: "surface:create", surfaceId: "s2", timestamp: ts(), protocol: "test" });
      expect(runtime.getSurfaces()).toHaveLength(2);
    });
  });
});
