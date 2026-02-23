import { describe, it, expect } from "vitest";
import { translateProps } from "../prop-translator";

describe("translateProps", () => {
  it("translates $state to BoundValue", () => {
    const result = translateProps({ label: { $state: "/name" } });
    expect(result).toEqual({ label: { path: "/name" } });
  });

  it("translates $cond to FunctionCall", () => {
    const result = translateProps({
      content: { $cond: "format", args: { value: "hello" } }
    });
    expect(result).toEqual({
      content: { call: "format", args: { value: "hello" } }
    });
  });

  it("translates $cond without args", () => {
    const result = translateProps({
      enabled: { $cond: "isActive" }
    });
    expect(result).toEqual({
      enabled: { call: "isActive" }
    });
  });

  it("translates $cond with nested $state in args", () => {
    const result = translateProps({
      text: { $cond: "format", args: { value: { $state: "/count" } } }
    });
    expect(result).toEqual({
      text: { call: "format", args: { value: { path: "/count" } } }
    });
  });

  it("recurses into nested objects", () => {
    const result = translateProps({
      style: {
        color: { $state: "/theme/color" },
        fontSize: 14
      }
    });
    expect(result).toEqual({
      style: {
        color: { path: "/theme/color" },
        fontSize: 14
      }
    });
  });

  it("recurses into arrays", () => {
    const result = translateProps({
      items: [
        { $state: "/items/0" },
        { $state: "/items/1" },
        "static"
      ]
    });
    expect(result).toEqual({
      items: [
        { path: "/items/0" },
        { path: "/items/1" },
        "static"
      ]
    });
  });

  it("passes through primitives", () => {
    const result = translateProps({
      str: "hello",
      num: 42,
      bool: true,
      nil: null,
      undef: undefined
    });
    expect(result).toEqual({
      str: "hello",
      num: 42,
      bool: true,
      nil: null,
      undef: undefined
    });
  });

  it("handles empty objects", () => {
    const result = translateProps({});
    expect(result).toEqual({});
  });

  it("handles deeply nested structures", () => {
    const result = translateProps({
      a: {
        b: {
          c: { $state: "/deep" }
        }
      }
    });
    expect(result).toEqual({
      a: {
        b: {
          c: { path: "/deep" }
        }
      }
    });
  });
});
