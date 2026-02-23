import { describe, expect, it, vi } from "vitest";
import { EventEmitter } from "../emitter";

describe("EventEmitter", () => {
  it("calls handler on emit", () => {
    const emitter = new EventEmitter<{ test: [string] }>();
    const handler = vi.fn();
    emitter.on("test", handler);
    emitter.emit("test", "hello");
    expect(handler).toHaveBeenCalledWith("hello");
  });

  it("supports multiple handlers", () => {
    const emitter = new EventEmitter<{ test: [number] }>();
    const h1 = vi.fn();
    const h2 = vi.fn();
    emitter.on("test", h1);
    emitter.on("test", h2);
    emitter.emit("test", 42);
    expect(h1).toHaveBeenCalledWith(42);
    expect(h2).toHaveBeenCalledWith(42);
  });

  it("returns unsubscribe function from on()", () => {
    const emitter = new EventEmitter<{ test: [string] }>();
    const handler = vi.fn();
    const unsub = emitter.on("test", handler);
    unsub();
    emitter.emit("test", "hello");
    expect(handler).not.toHaveBeenCalled();
  });

  it("off() removes a specific handler", () => {
    const emitter = new EventEmitter<{ test: [string] }>();
    const handler = vi.fn();
    emitter.on("test", handler);
    emitter.off("test", handler);
    emitter.emit("test", "hello");
    expect(handler).not.toHaveBeenCalled();
  });

  it("clear() removes all handlers", () => {
    const emitter = new EventEmitter<{ a: []; b: [] }>();
    const h1 = vi.fn();
    const h2 = vi.fn();
    emitter.on("a", h1);
    emitter.on("b", h2);
    emitter.clear();
    emitter.emit("a");
    emitter.emit("b");
    expect(h1).not.toHaveBeenCalled();
    expect(h2).not.toHaveBeenCalled();
  });

  it("does not throw when emitting with no handlers", () => {
    const emitter = new EventEmitter<{ test: [] }>();
    expect(() => emitter.emit("test")).not.toThrow();
  });

  it("does not throw when calling off() for unknown handler", () => {
    const emitter = new EventEmitter<{ test: [] }>();
    expect(() => emitter.off("test", vi.fn())).not.toThrow();
  });
});
