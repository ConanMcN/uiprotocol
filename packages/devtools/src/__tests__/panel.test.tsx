import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { Runtime } from "@uiprotocol/core";
import type { Command, UINode } from "@uiprotocol/core";
import { DevToolsPanel } from "../panel";

function createSurface(runtime: Runtime, surfaceId: string): void {
  runtime.applySingle({
    type: "surface:create",
    surfaceId,
    timestamp: Date.now(),
    protocol: "test"
  });
}

function upsertNodes(
  runtime: Runtime,
  surfaceId: string,
  nodes: Array<Partial<UINode> & Pick<UINode, "id">>
): void {
  runtime.applySingle({
    type: "nodes:upsert",
    surfaceId,
    timestamp: Date.now(),
    nodes
  });
}

describe("DevToolsPanel", () => {
  let runtime: Runtime;

  beforeEach(() => {
    runtime = new Runtime();
  });

  it("renders with title and initial state", () => {
    render(<DevToolsPanel runtime={runtime} />);

    expect(screen.getByText("UIProtocol DevTools")).toBeTruthy();
    expect(screen.getByText(/rev:0/)).toBeTruthy();
    expect(screen.getByText(/0 surface\(s\)/)).toBeTruthy();
  });

  it("shows 4 tabs", () => {
    render(<DevToolsPanel runtime={runtime} />);

    expect(screen.getByText("Surfaces")).toBeTruthy();
    expect(screen.getByText("Commands")).toBeTruthy();
    expect(screen.getByText("Events")).toBeTruthy();
    expect(screen.getByText("Trust")).toBeTruthy();
  });

  it("defaults to surfaces tab", () => {
    render(<DevToolsPanel runtime={runtime} />);

    expect(screen.getByText("No surfaces")).toBeTruthy();
  });

  it("shows surface count after adding surfaces", () => {
    createSurface(runtime, "s1");

    render(<DevToolsPanel runtime={runtime} />);

    expect(screen.getByText(/1 surface\(s\)/)).toBeTruthy();
  });

  it("displays surface inspector for each surface", () => {
    createSurface(runtime, "test-surface");
    upsertNodes(runtime, "test-surface", [
      { id: "root", type: "text", props: { content: "Hello" } }
    ]);

    render(<DevToolsPanel runtime={runtime} />);

    expect(screen.getByText(/test-surface/)).toBeTruthy();
  });

  it("switches to commands tab", () => {
    render(<DevToolsPanel runtime={runtime} />);

    fireEvent.click(screen.getByText("Commands"));

    expect(screen.getByText("No commands")).toBeTruthy();
  });

  it("shows commands after applying them", () => {
    createSurface(runtime, "s1");

    render(<DevToolsPanel runtime={runtime} />);

    fireEvent.click(screen.getByText("Commands"));

    // Should show the surface:create command
    expect(screen.getByText("surface:create")).toBeTruthy();
  });

  it("switches to events tab", () => {
    render(<DevToolsPanel runtime={runtime} />);

    fireEvent.click(screen.getByText("Events"));

    expect(screen.getByText("No events yet")).toBeTruthy();
  });

  it("shows events after runtime activity", () => {
    render(<DevToolsPanel runtime={runtime} />);

    act(() => {
      createSurface(runtime, "s1");
    });

    fireEvent.click(screen.getByText("Events"));

    // Should show command events from creating the surface
    expect(screen.queryByText("No events yet")).toBeNull();
  });

  it("switches to trust tab", () => {
    render(<DevToolsPanel runtime={runtime} />);

    fireEvent.click(screen.getByText("Trust"));

    expect(screen.getByText("Current Policy")).toBeTruthy();
    expect(screen.getByText("Verdict History")).toBeTruthy();
  });

  it("shows trust stats after commands", () => {
    createSurface(runtime, "s1");

    render(<DevToolsPanel runtime={runtime} />);

    fireEvent.click(screen.getByText("Trust"));

    expect(screen.getByText(/Allowed:/)).toBeTruthy();
    expect(screen.getByText(/Total:/)).toBeTruthy();
  });

  it("respects defaultTab prop", () => {
    render(<DevToolsPanel runtime={runtime} defaultTab="commands" />);

    expect(screen.getByText("No commands")).toBeTruthy();
  });

  it("updates revision on runtime changes", () => {
    const { rerender } = render(<DevToolsPanel runtime={runtime} />);

    expect(screen.getByText(/rev:0/)).toBeTruthy();

    act(() => {
      createSurface(runtime, "s1");
    });

    // Re-render to trigger useSyncExternalStore update
    rerender(<DevToolsPanel runtime={runtime} />);

    // Revision should have incremented
    expect(screen.queryByText(/rev:0 \|/)).toBeNull();
  });

  it("shows trust policy with deny default", () => {
    const rt = new Runtime({
      trustPolicy: {
        defaultPolicy: "deny",
        agents: {
          admin: { allow: ["*"] }
        }
      }
    });

    render(<DevToolsPanel runtime={rt} />);

    fireEvent.click(screen.getByText("Trust"));

    expect(screen.getByText(/deny/)).toBeTruthy();
  });

  it("shows blocked commands in trust tab", () => {
    const rt = new Runtime({
      trustPolicy: {
        defaultPolicy: "deny"
      }
    });

    // This should be blocked by trust
    rt.applySingle({
      type: "surface:create",
      surfaceId: "blocked-surface",
      timestamp: Date.now(),
      protocol: "test"
    });

    render(<DevToolsPanel runtime={rt} />);

    fireEvent.click(screen.getByText("Trust"));

    expect(screen.getByText(/Rejected:/)).toBeTruthy();
  });
});
