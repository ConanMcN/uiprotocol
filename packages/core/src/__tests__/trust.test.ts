import { describe, expect, it } from "vitest";
import { TrustEngine, createDefaultPolicy } from "../trust";
import type { Command, TrustConfig } from "../types";

function makeUpsert(types: string[]): Command {
  return {
    type: "nodes:upsert",
    surfaceId: "s1",
    timestamp: Date.now(),
    nodes: types.map((t, i) => ({ id: `n${i}`, type: t, props: {} }))
  };
}

describe("TrustEngine", () => {
  it("allows all commands with default policy", () => {
    const engine = new TrustEngine();
    const cmd: Command = { type: "surface:create", surfaceId: "s1", timestamp: 0, protocol: "a2ui" };
    expect(engine.evaluate(cmd)).toEqual({ allowed: true });
  });

  it("denies commands when defaultPolicy is deny and no agent", () => {
    const engine = new TrustEngine({ defaultPolicy: "deny" });
    const cmd: Command = { type: "surface:create", surfaceId: "s1", timestamp: 0, protocol: "a2ui" };
    const verdict = engine.evaluate(cmd);
    expect(verdict.allowed).toBe(false);
  });

  it("denies when agent has no permissions in deny-by-default", () => {
    const engine = new TrustEngine({ defaultPolicy: "deny", agents: {} });
    const cmd: Command = { type: "surface:create", surfaceId: "s1", timestamp: 0, protocol: "a2ui" };
    const verdict = engine.evaluate(cmd, undefined, "unknown-agent");
    expect(verdict.allowed).toBe(false);
  });

  it("allows when agent has permissions in deny-by-default", () => {
    const config: TrustConfig = {
      defaultPolicy: "deny",
      agents: { agent1: { allow: ["Text", "Button"] } }
    };
    const engine = new TrustEngine(config);
    const cmd = makeUpsert(["Text"]);
    const verdict = engine.evaluate(cmd, undefined, "agent1");
    expect(verdict.allowed).toBe(true);
  });

  it("blocks denied node types", () => {
    const config: TrustConfig = {
      agents: { agent1: { deny: ["Script"] } }
    };
    const engine = new TrustEngine(config);
    const cmd = makeUpsert(["Script"]);
    const verdict = engine.evaluate(cmd, undefined, "agent1");
    expect(verdict.allowed).toBe(false);
    if (!verdict.allowed) {
      expect(verdict.reason).toContain("Script");
      expect(verdict.reason).toContain("denied");
    }
  });

  it("blocks node types not in allow list", () => {
    const config: TrustConfig = {
      agents: { agent1: { allow: ["Text"] } }
    };
    const engine = new TrustEngine(config);
    const cmd = makeUpsert(["Iframe"]);
    const verdict = engine.evaluate(cmd, undefined, "agent1");
    expect(verdict.allowed).toBe(false);
    if (!verdict.allowed) {
      expect(verdict.reason).toContain("Iframe");
    }
  });

  it("blocks requireConsent node types", () => {
    const config: TrustConfig = {
      requireConsent: ["PaymentForm"]
    };
    const engine = new TrustEngine(config);
    const cmd = makeUpsert(["PaymentForm"]);
    const verdict = engine.evaluate(cmd);
    expect(verdict.allowed).toBe(false);
    if (!verdict.allowed) {
      expect(verdict.reason).toContain("consent");
    }
  });

  it("allows non-consent-requiring node types", () => {
    const config: TrustConfig = {
      requireConsent: ["PaymentForm"]
    };
    const engine = new TrustEngine(config);
    const cmd = makeUpsert(["Text"]);
    expect(engine.evaluate(cmd)).toEqual({ allowed: true });
  });

  it("createDefaultPolicy returns allow policy", () => {
    const policy = createDefaultPolicy();
    expect(policy.defaultPolicy).toBe("allow");
  });

  it("setConfig updates the config", () => {
    const engine = new TrustEngine();
    engine.setConfig({ defaultPolicy: "deny" });
    expect(engine.getConfig().defaultPolicy).toBe("deny");
  });
});
