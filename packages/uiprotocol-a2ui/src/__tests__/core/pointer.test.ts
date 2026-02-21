import { describe, expect, it } from "vitest";
import {
  removeByPointer,
  resolveByPointer,
  resolvePointerPath,
  setByPointer
} from "../../core";

describe("pointer utilities", () => {
  it("resolves escaped tokens", () => {
    const model = {
      "a/b": {
        "c~d": "ok"
      }
    };

    expect(resolveByPointer(model, "/a~1b/c~0d")).toBe("ok");
  });

  it("sets values immutably", () => {
    const base = { user: { name: "old" } };
    const next = setByPointer(base, "/user/name", "new") as {
      user: { name: string };
    };

    expect(base.user.name).toBe("old");
    expect(next.user.name).toBe("new");
  });

  it("removes values immutably", () => {
    const base = { user: { name: "conan", role: "admin" } };
    const next = removeByPointer(base, "/user/role") as {
      user: { name: string; role?: string };
    };

    expect(base.user.role).toBe("admin");
    expect(next.user).toEqual({ name: "conan" });
  });

  it("resolves relative scope paths", () => {
    expect(resolvePointerPath("./name", "/items/0")).toBe("/items/0/name");
    expect(resolvePointerPath("../1/name", "/items/0")).toBe("/items/1/name");
  });
});
