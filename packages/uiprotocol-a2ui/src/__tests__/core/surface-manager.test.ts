import { describe, expect, it } from "vitest";
import { createSurfaceManager } from "../../core";

describe("SurfaceManager", () => {
  it("applies merge-by-id patches and keeps existing component type", () => {
    const manager = createSurfaceManager();

    manager.apply({
      version: "v0.9",
      createSurface: { surfaceId: "s1" }
    });

    manager.apply({
      version: "v0.9",
      updateComponents: {
        surfaceId: "s1",
        components: [
          { id: "root", component: "Column", children: ["title", "orphan"] },
          { id: "title", component: "Text", text: "Hello" },
          { id: "orphan", component: "Text", text: "remove me" }
        ]
      }
    });

    manager.apply({
      version: "v0.9",
      updateComponents: {
        surfaceId: "s1",
        components: [{ id: "title", text: "Updated" }]
      }
    });

    const surface = manager.getSurface("s1");
    expect(surface).toBeDefined();

    expect(surface?.components.get("title")?.component).toBe("Text");
    expect(surface?.components.get("title")?.text).toBe("Updated");

    manager.apply({
      version: "v0.9",
      updateComponents: {
        surfaceId: "s1",
        components: [{ id: "root", children: ["title"] }]
      }
    });

    expect(surface?.components.has("orphan")).toBe(false);
  });

  it("defaults updateDataModel path to root", () => {
    const manager = createSurfaceManager();

    manager.apply({
      version: "v0.9",
      createSurface: { surfaceId: "s1" }
    });

    manager.apply({
      version: "v0.9",
      updateDataModel: {
        surfaceId: "s1",
        value: {
          user: {
            name: "Conan"
          }
        }
      }
    });

    const surface = manager.getSurface("s1");
    expect(surface?.dataModel).toEqual({
      user: {
        name: "Conan"
      }
    });
  });

  it("removes path when value is omitted", () => {
    const manager = createSurfaceManager();

    manager.apply({
      version: "v0.9",
      createSurface: { surfaceId: "s1" }
    });

    manager.apply({
      version: "v0.9",
      updateDataModel: {
        surfaceId: "s1",
        path: "/user",
        value: { name: "Conan" }
      }
    });

    manager.apply({
      version: "v0.9",
      updateDataModel: {
        surfaceId: "s1",
        path: "/user"
      }
    });

    expect(manager.getSurface("s1")?.dataModel).toEqual({});
  });

  it("deletes surface", () => {
    const manager = createSurfaceManager();

    manager.apply({
      version: "v0.9",
      createSurface: { surfaceId: "s1" }
    });

    manager.apply({
      version: "v0.9",
      deleteSurface: { surfaceId: "s1" }
    });

    expect(manager.getSurface("s1")).toBeUndefined();
  });
});
