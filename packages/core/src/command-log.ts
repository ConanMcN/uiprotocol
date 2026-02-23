import type { Command, TrustVerdict } from "./types";

export interface CommandLogEntry {
  command: Command;
  verdict: TrustVerdict;
  timestamp: number;
}

export class CommandLog {
  private readonly entries: CommandLogEntry[] = [];

  append(command: Command, verdict: TrustVerdict): void {
    this.entries.push({
      command,
      verdict,
      timestamp: Date.now()
    });
  }

  getAll(): readonly CommandLogEntry[] {
    return this.entries;
  }

  getBySurface(surfaceId: string): CommandLogEntry[] {
    return this.entries.filter((entry) => "surfaceId" in entry.command && entry.command.surfaceId === surfaceId);
  }

  getApplied(): CommandLogEntry[] {
    return this.entries.filter((entry) => entry.verdict.allowed);
  }

  getRejected(): CommandLogEntry[] {
    return this.entries.filter((entry) => !entry.verdict.allowed);
  }

  getRange(start: number, end?: number): CommandLogEntry[] {
    return this.entries.slice(start, end);
  }

  size(): number {
    return this.entries.length;
  }

  clear(): void {
    this.entries.length = 0;
  }
}
