import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { Runtime } from "@uiprotocol/core";
import { useCommandLog } from "../hooks/useCommandLog";
import { useEvents } from "../hooks/useEvents";

describe("useCommandLog", () => {
  let runtime: Runtime;

  beforeEach(() => {
    runtime = new Runtime();
  });

  it("starts with empty entries", () => {
    const { result } = renderHook(() => useCommandLog(runtime));
    expect(result.current).toEqual([]);
  });

  it("captures commands after they are applied", () => {
    const { result } = renderHook(() => useCommandLog(runtime));

    act(() => {
      runtime.applySingle({
        type: "surface:create",
        surfaceId: "s1",
        timestamp: 1000,
        protocol: "test"
      });
    });

    expect(result.current).toHaveLength(1);
    expect(result.current[0].command.type).toBe("surface:create");
    expect(result.current[0].verdict.allowed).toBe(true);
  });

  it("captures multiple commands in order", () => {
    const { result } = renderHook(() => useCommandLog(runtime));

    act(() => {
      runtime.applySingle({
        type: "surface:create",
        surfaceId: "s1",
        timestamp: 1000,
        protocol: "test"
      });
      runtime.applySingle({
        type: "nodes:upsert",
        surfaceId: "s1",
        timestamp: 1001,
        nodes: [{ id: "root", type: "text", props: { content: "Hello" } }]
      });
    });

    expect(result.current).toHaveLength(2);
    expect(result.current[0].command.type).toBe("surface:create");
    expect(result.current[1].command.type).toBe("nodes:upsert");
  });

  it("captures trust-blocked commands", () => {
    const rt = new Runtime({
      trustPolicy: { defaultPolicy: "deny" }
    });

    const { result } = renderHook(() => useCommandLog(rt));

    act(() => {
      rt.applySingle({
        type: "surface:create",
        surfaceId: "blocked",
        timestamp: 1000,
        protocol: "test"
      });
    });

    expect(result.current).toHaveLength(1);
    expect(result.current[0].verdict.allowed).toBe(false);
  });

  it("respects maxEntries limit", () => {
    const { result } = renderHook(() => useCommandLog(runtime, 2));

    act(() => {
      for (let i = 0; i < 5; i++) {
        runtime.applySingle({
          type: "surface:create",
          surfaceId: `s${i}`,
          timestamp: 1000 + i,
          protocol: "test"
        });
      }
    });

    expect(result.current).toHaveLength(2);
    // Should keep the last 2
    expect((result.current[0].command as { surfaceId: string }).surfaceId).toBe("s3");
    expect((result.current[1].command as { surfaceId: string }).surfaceId).toBe("s4");
  });
});

describe("useEvents", () => {
  let runtime: Runtime;

  beforeEach(() => {
    runtime = new Runtime();
  });

  it("starts with empty entries", () => {
    const { result } = renderHook(() => useEvents(runtime));
    expect(result.current).toEqual([]);
  });

  it("captures command events", () => {
    const { result } = renderHook(() => useEvents(runtime));

    act(() => {
      runtime.applySingle({
        type: "surface:create",
        surfaceId: "s1",
        timestamp: 1000,
        protocol: "test"
      });
    });

    // Should capture command:before and command events
    const types = result.current.map((e) => e.type);
    expect(types).toContain("command:before");
    expect(types).toContain("command");
  });

  it("captures trust:blocked events", () => {
    const rt = new Runtime({
      trustPolicy: { defaultPolicy: "deny" }
    });

    const { result } = renderHook(() => useEvents(rt));

    act(() => {
      rt.applySingle({
        type: "surface:create",
        surfaceId: "blocked",
        timestamp: 1000,
        protocol: "test"
      });
    });

    const types = result.current.map((e) => e.type);
    expect(types).toContain("trust:blocked");
    expect(types).toContain("error");
  });

  it("filters events by type", () => {
    const { result } = renderHook(() =>
      useEvents(runtime, ["command"])
    );

    act(() => {
      runtime.applySingle({
        type: "surface:create",
        surfaceId: "s1",
        timestamp: 1000,
        protocol: "test"
      });
    });

    // Should only capture "command", not "command:before"
    expect(result.current.every((e) => e.type === "command")).toBe(true);
    expect(result.current).toHaveLength(1);
  });

  it("respects maxEntries limit", () => {
    const { result } = renderHook(() => useEvents(runtime, ["command"], 3));

    act(() => {
      for (let i = 0; i < 10; i++) {
        runtime.applySingle({
          type: "surface:create",
          surfaceId: `s${i}`,
          timestamp: 1000 + i,
          protocol: "test"
        });
      }
    });

    expect(result.current.length).toBeLessThanOrEqual(3);
  });

  it("includes timestamp on each entry", () => {
    const dateSpy = vi.spyOn(Date, "now").mockReturnValue(5000);

    const { result } = renderHook(() => useEvents(runtime));

    act(() => {
      runtime.applySingle({
        type: "surface:create",
        surfaceId: "s1",
        timestamp: 1000,
        protocol: "test"
      });
    });

    expect(result.current.length).toBeGreaterThan(0);
    expect(result.current[0].timestamp).toBe(5000);

    dateSpy.mockRestore();
  });
});
