import { describe, expect, it } from "vitest";
import { FunctionRegistry } from "../../core";

describe("FunctionRegistry", () => {
  const registry = new FunctionRegistry();

  it("implements required", () => {
    expect(registry.execute("required", { value: "x" })).toBe(true);
    expect(registry.execute("required", { value: "" })).toBe(false);
  });

  it("implements regex and email", () => {
    expect(
      registry.execute("regex", { value: "abc123", pattern: "^[a-z]+\\d+$" })
    ).toBe(true);
    expect(registry.execute("email", { value: "hello@example.com" })).toBe(true);
  });

  it("implements logical and comparison functions", () => {
    expect(registry.execute("and", { values: [true, 1, "x"] })).toBe(true);
    expect(registry.execute("or", { values: [false, 0, "x"] })).toBe(true);
    expect(registry.execute("not", { value: true })).toBe(false);
    expect(registry.execute("equals", { left: 1, right: 1 })).toBe(true);
    expect(registry.execute("greaterThan", { left: 3, right: 2 })).toBe(true);
    expect(registry.execute("lessThan", { left: 1, right: 2 })).toBe(true);
  });

  it("implements formatting functions", () => {
    expect(
      registry.execute("formatString", {
        template: "Hello {name}",
        values: { name: "Conan" }
      })
    ).toBe("Hello Conan");

    expect(registry.execute("formatNumber", { value: 1200 })).toBe("1,200");
  });
});
