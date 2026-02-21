import { describe, expect, it } from "vitest";
import { FunctionRegistry, resolveDynamicValue, resolveUnknownValue } from "../../core";

describe("resolver", () => {
  const dataModel = {
    profile: {
      name: "Conan"
    },
    items: [
      {
        name: "Alpha"
      }
    ]
  };

  it("resolves bound absolute values", () => {
    const resolved = resolveDynamicValue<string>(
      { path: "/profile/name" },
      { dataModel }
    );

    expect(resolved).toBe("Conan");
  });

  it("resolves bound relative values", () => {
    const resolved = resolveDynamicValue<string>(
      { path: "./name" },
      {
        dataModel,
        scopePath: "/items/0"
      }
    );

    expect(resolved).toBe("Alpha");
  });

  it("executes function calls", () => {
    const registry = new FunctionRegistry();

    const resolved = resolveDynamicValue<string>(
      {
        call: "concat",
        args: {
          values: [{ path: "/profile/name" }, " says hi"],
          separator: ""
        }
      },
      {
        dataModel,
        functionRegistry: registry
      }
    );

    expect(resolved).toBe("Conan says hi");
  });

  it("throws for unknown functions", () => {
    expect(() =>
      resolveDynamicValue(
        {
          call: "doesNotExist",
          args: {}
        },
        {
          dataModel
        }
      )
    ).toThrow(/Unknown function/);
  });

  it("handles circular data model references without infinite loop", () => {
    const circular: Record<string, unknown> = { name: "root" };
    circular.self = circular;

    const result = resolveUnknownValue(circular, { dataModel: {} });
    expect(result).toBeDefined();
    expect((result as Record<string, unknown>).name).toBe("root");
    expect((result as Record<string, unknown>).self).toBeUndefined();
  });
});
