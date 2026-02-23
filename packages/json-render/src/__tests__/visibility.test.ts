import { describe, it, expect } from "vitest";
import { visibilityToFunctionCall } from "../visibility";

describe("visibilityToFunctionCall", () => {
  it("converts a simple condition", () => {
    const result = visibilityToFunctionCall({ $cond: "isLoggedIn" });
    expect(result).toEqual({ call: "isLoggedIn" });
  });

  it("converts a condition with args", () => {
    const result = visibilityToFunctionCall({
      $cond: "hasRole",
      args: { role: "admin" }
    });
    expect(result).toEqual({
      call: "hasRole",
      args: { role: "admin" }
    });
  });

  it("translates $state expressions within args", () => {
    const result = visibilityToFunctionCall({
      $cond: "equals",
      args: { left: { $state: "/status" }, right: "active" }
    });
    expect(result).toEqual({
      call: "equals",
      args: { left: { path: "/status" }, right: "active" }
    });
  });

  it("does not include args key when args is undefined", () => {
    const result = visibilityToFunctionCall({ $cond: "check" });
    expect(result).toEqual({ call: "check" });
    expect("args" in result).toBe(false);
  });
});
