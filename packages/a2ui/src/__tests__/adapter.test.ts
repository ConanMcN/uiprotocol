import { describe, it, expect } from "vitest";
import { A2UIAdapter } from "../adapter";

describe("A2UIAdapter", () => {
  const adapter = new A2UIAdapter();

  it("has protocol set to 'a2ui'", () => {
    expect(adapter.protocol).toBe("a2ui");
  });

  describe("parse createSurface", () => {
    it("produces a surface:create command", () => {
      const result = adapter.parse({
        version: "v0.9",
        createSurface: {
          surfaceId: "s1",
          catalogId: "catalog-1",
          theme: { primaryColor: "#ff0000" },
        },
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.value).toHaveLength(1);
      const cmd = result.value[0];
      expect(cmd.type).toBe("surface:create");
      expect(cmd.surfaceId).toBe("s1");
      if (cmd.type === "surface:create") {
        expect(cmd.protocol).toBe("a2ui");
        expect(cmd.catalogId).toBe("catalog-1");
        expect(cmd.theme).toEqual({ primaryColor: "#ff0000" });
        expect(cmd.timestamp).toBeGreaterThan(0);
      }
    });
  });

  describe("parse updateComponents", () => {
    it("produces a nodes:upsert command with correct UINode shape", () => {
      const result = adapter.parse({
        version: "v0.9",
        updateComponents: {
          surfaceId: "s1",
          components: [
            {
              id: "btn1",
              component: "Button",
              label: "Click me",
              disabled: false,
              children: ["child1", "child2"],
              checks: [{ call: "isNotEmpty" }],
            },
          ],
        },
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.value).toHaveLength(1);
      const cmd = result.value[0];
      expect(cmd.type).toBe("nodes:upsert");
      if (cmd.type !== "nodes:upsert") return;

      expect(cmd.surfaceId).toBe("s1");
      expect(cmd.nodes).toHaveLength(1);

      const node = cmd.nodes[0];
      expect(node.id).toBe("btn1");
      expect(node.type).toBe("Button");
      expect(node.children).toEqual(["child1", "child2"]);
      expect(node.checks).toEqual([{ call: "isNotEmpty" }]);
      // Other props should be in node.props
      expect(node.props).toEqual({
        label: "Click me",
        disabled: false,
      });
    });

    it("puts child ref key into props", () => {
      const result = adapter.parse({
        version: "v0.9",
        updateComponents: {
          surfaceId: "s1",
          components: [
            {
              id: "panel1",
              component: "Panel",
              child: "content1",
            },
          ],
        },
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const cmd = result.value[0];
      if (cmd.type !== "nodes:upsert") return;

      const node = cmd.nodes[0];
      expect(node.props).toHaveProperty("child", "content1");
    });

    it("handles components with only id (partial update)", () => {
      const result = adapter.parse({
        version: "v0.9",
        updateComponents: {
          surfaceId: "s1",
          components: [
            {
              id: "btn1",
              label: "Updated label",
            },
          ],
        },
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const cmd = result.value[0];
      if (cmd.type !== "nodes:upsert") return;

      const node = cmd.nodes[0];
      expect(node.id).toBe("btn1");
      expect(node.type).toBeUndefined();
      expect(node.props).toEqual({ label: "Updated label" });
    });
  });

  describe("parse updateDataModel", () => {
    it("produces a data:set command when value is present", () => {
      const result = adapter.parse({
        version: "v0.9",
        updateDataModel: {
          surfaceId: "s1",
          path: "/user/name",
          value: "Alice",
        },
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.value).toHaveLength(1);
      const cmd = result.value[0];
      expect(cmd.type).toBe("data:set");
      if (cmd.type !== "data:set") return;

      expect(cmd.surfaceId).toBe("s1");
      expect(cmd.path).toBe("/user/name");
      expect(cmd.value).toBe("Alice");
    });

    it("produces a data:remove command when value is absent", () => {
      const result = adapter.parse({
        version: "v0.9",
        updateDataModel: {
          surfaceId: "s1",
          path: "/user/name",
        },
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.value).toHaveLength(1);
      const cmd = result.value[0];
      expect(cmd.type).toBe("data:remove");
      if (cmd.type !== "data:remove") return;

      expect(cmd.surfaceId).toBe("s1");
      expect(cmd.path).toBe("/user/name");
    });

    it("defaults path to '/' when not provided", () => {
      const result = adapter.parse({
        version: "v0.9",
        updateDataModel: {
          surfaceId: "s1",
          value: { name: "Alice" },
        },
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const cmd = result.value[0];
      if (cmd.type !== "data:set") return;

      expect(cmd.path).toBe("/");
      expect(cmd.value).toEqual({ name: "Alice" });
    });
  });

  describe("parse deleteSurface", () => {
    it("produces a surface:delete command", () => {
      const result = adapter.parse({
        version: "v0.9",
        deleteSurface: {
          surfaceId: "s1",
        },
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.value).toHaveLength(1);
      const cmd = result.value[0];
      expect(cmd.type).toBe("surface:delete");
      expect(cmd.surfaceId).toBe("s1");
      expect(cmd.timestamp).toBeGreaterThan(0);
    });
  });

  describe("parse invalid input", () => {
    it("returns parse error for invalid JSON string", () => {
      const result = adapter.parse("{not valid json}");

      expect(result.ok).toBe(false);
      if (result.ok) return;

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].code).toBe("A2UI_INVALID_JSON");
    });

    it("returns error for non-object input", () => {
      const result = adapter.parse(42);

      expect(result.ok).toBe(false);
      if (result.ok) return;

      expect(result.errors[0].code).toBe("A2UI_INVALID_ENVELOPE");
    });

    it("returns error for unsupported version", () => {
      const result = adapter.parse({
        version: "v0.1",
        createSurface: { surfaceId: "s1" },
      });

      expect(result.ok).toBe(false);
      if (result.ok) return;

      expect(result.errors[0].code).toBe("A2UI_UNSUPPORTED_VERSION");
    });

    it("returns error for missing surfaceId", () => {
      const result = adapter.parse({
        version: "v0.9",
        createSurface: {},
      });

      expect(result.ok).toBe(false);
      if (result.ok) return;

      expect(result.errors[0].code).toBe("A2UI_MISSING_FIELD");
    });

    it("returns error for missing operation key", () => {
      const result = adapter.parse({
        version: "v0.9",
      });

      expect(result.ok).toBe(false);
      if (result.ok) return;

      expect(result.errors[0].code).toBe("A2UI_INVALID_ENVELOPE");
    });
  });

  describe("parse JSON strings", () => {
    it("parses a valid JSON string", () => {
      const jsonStr = JSON.stringify({
        version: "v0.9",
        deleteSurface: { surfaceId: "s1" },
      });

      const result = adapter.parse(jsonStr);
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.value).toHaveLength(1);
      expect(result.value[0].type).toBe("surface:delete");
    });
  });
});
