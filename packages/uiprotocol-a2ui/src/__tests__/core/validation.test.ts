import { describe, expect, it } from "vitest";
import { FunctionRegistry, validateValue } from "../../core";

describe("validateValue", () => {
  it("blocks regex failures", () => {
    const result = validateValue(
      {
        value: "abc",
        pattern: "^\\d+$",
        dataModel: {}
      },
      new FunctionRegistry()
    );

    expect(result.ok).toBe(false);
    expect(result.errors[0].code).toBe("A2UI_VALIDATION_REGEX_FAILED");
  });

  it("blocks failed checks", () => {
    const result = validateValue(
      {
        value: "",
        checks: [{ call: "required" }],
        dataModel: {}
      },
      new FunctionRegistry()
    );

    expect(result.ok).toBe(false);
    expect(result.errors[0].code).toBe("A2UI_VALIDATION_CHECK_FAILED");
  });

  it("passes valid values", () => {
    const result = validateValue(
      {
        value: "hello@example.com",
        checks: [{ call: "email" }],
        dataModel: {}
      },
      new FunctionRegistry()
    );

    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});
