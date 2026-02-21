import { describe, expect, it } from "vitest";
import { getMessageType, parseMessage } from "../../core";

describe("parseMessage", () => {
  it("parses valid createSurface", () => {
    const result = parseMessage({
      version: "v0.9",
      createSurface: {
        surfaceId: "s1"
      }
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(getMessageType(result.value)).toBe("createSurface");
    }
  });

  it("rejects invalid json", () => {
    const result = parseMessage("{not-json");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0].code).toBe("A2UI_INVALID_JSON");
    }
  });

  it("rejects non-v0.9 messages", () => {
    const result = parseMessage({
      version: "v0.8",
      createSurface: { surfaceId: "s1" }
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0].code).toBe("A2UI_UNSUPPORTED_VERSION");
    }
  });

  it("accepts unknown component fields while validating envelope", () => {
    const result = parseMessage({
      version: "v0.9",
      updateComponents: {
        surfaceId: "s1",
        components: [
          {
            id: "root",
            component: "Column",
            totallyUnknown: {
              nested: true
            }
          }
        ]
      }
    });

    expect(result.ok).toBe(true);
  });

  it("rejects envelopes with multiple operation keys", () => {
    const result = parseMessage({
      version: "v0.9",
      createSurface: { surfaceId: "s1" },
      deleteSurface: { surfaceId: "s1" }
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0].code).toBe("A2UI_INVALID_ENVELOPE");
    }
  });

  it("warns when a component references itself as a child", () => {
    const result = parseMessage({
      version: "v0.9",
      updateComponents: {
        surfaceId: "s1",
        components: [
          { id: "root", component: "Column", children: ["root"] }
        ]
      }
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0].code).toBe("A2UI_INVALID_ENVELOPE");
      expect(result.warnings[0].message).toContain("references itself");
    }
  });
});
