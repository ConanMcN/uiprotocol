import type { Command, Diagnostic, Surface, TrustConfig, TrustVerdict } from "@uiprotocol/core";

export interface CommandLogDisplayEntry {
  command: Command;
  verdict: TrustVerdict;
  timestamp: number;
}

export interface EventLogEntry {
  type: string;
  payload: unknown;
  timestamp: number;
}

export type DevToolsTab = "surfaces" | "commands" | "events" | "trust";

export interface DevToolsPanelProps {
  defaultTab?: DevToolsTab;
}
