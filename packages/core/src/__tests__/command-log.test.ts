import { describe, expect, it } from "vitest";
import { CommandLog } from "../command-log";
import type { Command } from "../types";

function makeCommand(type: string, surfaceId = "s1"): Command {
  return { type: "surface:create", surfaceId, timestamp: Date.now(), protocol: "test" } as Command;
}

describe("CommandLog", () => {
  it("starts empty", () => {
    const log = new CommandLog();
    expect(log.size()).toBe(0);
    expect(log.getAll()).toEqual([]);
  });

  it("appends entries", () => {
    const log = new CommandLog();
    const cmd = makeCommand("surface:create");
    log.append(cmd, { allowed: true });
    expect(log.size()).toBe(1);
    expect(log.getAll()[0].command).toBe(cmd);
  });

  it("filters by surface", () => {
    const log = new CommandLog();
    log.append(makeCommand("surface:create", "s1"), { allowed: true });
    log.append(makeCommand("surface:create", "s2"), { allowed: true });
    expect(log.getBySurface("s1")).toHaveLength(1);
    expect(log.getBySurface("s2")).toHaveLength(1);
  });

  it("filters applied vs rejected", () => {
    const log = new CommandLog();
    log.append(makeCommand("surface:create"), { allowed: true });
    log.append(makeCommand("surface:create"), { allowed: false, reason: "denied" });
    expect(log.getApplied()).toHaveLength(1);
    expect(log.getRejected()).toHaveLength(1);
  });

  it("getRange returns a slice", () => {
    const log = new CommandLog();
    log.append(makeCommand("surface:create", "s1"), { allowed: true });
    log.append(makeCommand("surface:create", "s2"), { allowed: true });
    log.append(makeCommand("surface:create", "s3"), { allowed: true });
    expect(log.getRange(1, 2)).toHaveLength(1);
    expect(log.getRange(0)).toHaveLength(3);
  });

  it("clear removes all entries", () => {
    const log = new CommandLog();
    log.append(makeCommand("surface:create"), { allowed: true });
    log.clear();
    expect(log.size()).toBe(0);
  });
});
