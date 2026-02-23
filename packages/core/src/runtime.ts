import { defaultChildRefCollector } from "./child-refs";
import { CommandLog } from "./command-log";
import {
  DIAGNOSTIC_CODES,
  diagnostic
} from "./diagnostics";
import { EventEmitter } from "./emitter";
import { FunctionRegistry, type FunctionExecutor } from "./function-registry";
import { removeByPointer, setByPointer } from "./pointer";
import { TrustEngine } from "./trust";
import type {
  ApplyResult,
  ChildRefCollector,
  Command,
  Diagnostic,
  ParseResult,
  ProtocolAdapter,
  Surface,
  TrustConfig,
  UINode
} from "./types";

type Listener = () => void;

export interface RuntimeEvents {
  command: [Command];
  "command:before": [Command];
  "trust:blocked": [Command, string];
  error: [Diagnostic];
  warning: [Diagnostic];
}

export interface RuntimeOptions {
  trustPolicy?: TrustConfig;
  customFunctions?: Record<string, FunctionExecutor>;
}

function cloneNodePatch(
  existing: UINode | undefined,
  patch: Partial<UINode> & Pick<UINode, "id">
): UINode | null {
  const nextType =
    typeof patch.type === "string" && patch.type.length > 0
      ? patch.type
      : existing?.type;

  if (!nextType) {
    return null;
  }

  const existingProps = existing?.props ?? {};
  const patchProps = patch.props ?? {};

  return {
    id: patch.id,
    type: nextType,
    children: patch.children ?? existing?.children,
    checks: patch.checks ?? existing?.checks,
    props: { ...existingProps, ...patchProps }
  };
}

function pruneUnreachable(
  surface: Surface,
  collector: ChildRefCollector
): string[] {
  const root = surface.nodes.get("root");
  if (!root) {
    return [];
  }

  const visited = new Set<string>();
  const queue = ["root"];

  while (queue.length > 0) {
    const currentId = queue.shift() as string;
    if (visited.has(currentId)) {
      continue;
    }

    visited.add(currentId);
    const node = surface.nodes.get(currentId);
    if (!node) {
      continue;
    }

    const children = collector(node);
    for (const childId of children) {
      if (!visited.has(childId)) {
        queue.push(childId);
      }
    }
  }

  const removed: string[] = [];
  for (const id of surface.nodes.keys()) {
    if (!visited.has(id)) {
      surface.nodes.delete(id);
      removed.push(id);
    }
  }

  return removed;
}

export class Runtime {
  readonly events = new EventEmitter<RuntimeEvents>();
  readonly commandLog = new CommandLog();
  readonly functionRegistry: FunctionRegistry;

  private readonly surfaces = new Map<string, Surface>();
  private readonly listeners = new Set<Listener>();
  private readonly trustEngine: TrustEngine;
  private readonly childRefCollectors = new Map<string, ChildRefCollector>();
  private revision = 0;

  constructor(options?: RuntimeOptions) {
    this.trustEngine = new TrustEngine(options?.trustPolicy);
    this.functionRegistry = new FunctionRegistry(options?.customFunctions);
  }

  // ── State access ──

  getSurface(id: string): Surface | undefined {
    return this.surfaces.get(id);
  }

  getSurfaces(): Surface[] {
    return Array.from(this.surfaces.values());
  }

  getRevision(): number {
    return this.revision;
  }

  // ── Command processing ──

  apply(commands: Command[]): ApplyResult {
    const allDiagnostics: Diagnostic[] = [];
    let allOk = true;

    for (const command of commands) {
      const result = this.applySingle(command);
      allDiagnostics.push(...result.diagnostics);
      if (!result.ok) {
        allOk = false;
      }
    }

    return { ok: allOk, diagnostics: allDiagnostics };
  }

  applySingle(command: Command, agentId?: string): ApplyResult {
    // 1. Emit command:before
    this.events.emit("command:before", command);

    // 2. Trust check
    const surface = "surfaceId" in command
      ? this.surfaces.get(command.surfaceId)
      : undefined;
    const verdict = this.trustEngine.evaluate(command, surface, agentId);

    this.commandLog.append(command, verdict);

    if (!verdict.allowed) {
      const diag = diagnostic(
        DIAGNOSTIC_CODES.trustViolation,
        verdict.reason,
        { severity: "error" }
      );
      this.events.emit("trust:blocked", command, verdict.reason);
      this.events.emit("error", diag);
      return { ok: false, diagnostics: [diag] };
    }

    // 3. Mutate state
    const result = this.mutate(command);

    // 4. Emit command, notify subscribers
    this.events.emit("command", command);
    this.notify();

    return result;
  }

  // ── Convenience: parse + apply ──

  processMessage(
    adapter: ProtocolAdapter,
    raw: unknown
  ): { parseResult: ParseResult<Command[]>; applyResult?: ApplyResult } {
    const parseResult = adapter.parse(raw);

    if (!parseResult.ok) {
      return { parseResult };
    }

    const applyResult = this.apply(parseResult.value);
    return { parseResult, applyResult };
  }

  // ── Trust ──

  getTrustPolicy(): TrustConfig {
    return this.trustEngine.getConfig();
  }

  setTrustPolicy(policy: TrustConfig): void {
    this.trustEngine.setConfig(policy);
  }

  // ── Child ref collectors ──

  setChildRefCollector(protocol: string, collector: ChildRefCollector): void {
    this.childRefCollectors.set(protocol, collector);
  }

  // ── Subscription (for useSyncExternalStore) ──

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  // ── Internal ──

  private getCollector(protocol?: string): ChildRefCollector {
    if (protocol) {
      const custom = this.childRefCollectors.get(protocol);
      if (custom) {
        return custom;
      }
    }
    return defaultChildRefCollector;
  }

  private mutate(command: Command): ApplyResult {
    switch (command.type) {
      case "surface:create":
        return this.createSurface(command);
      case "surface:delete":
        return this.deleteSurface(command);
      case "nodes:upsert":
        return this.upsertNodes(command);
      case "nodes:remove":
        return this.removeNodes(command);
      case "data:set":
        return this.setData(command);
      case "data:remove":
        return this.removeData(command);
      default:
        return {
          ok: false,
          diagnostics: [
            diagnostic(DIAGNOSTIC_CODES.unknownMessageType, "Unknown command type.")
          ]
        };
    }
  }

  private createSurface(command: Extract<Command, { type: "surface:create" }>): ApplyResult {
    const surface: Surface = {
      id: command.surfaceId,
      protocol: command.protocol,
      catalogId: command.catalogId,
      theme: command.theme,
      nodes: new Map<string, UINode>(),
      dataModel: {},
      metadata: command.metadata
    };

    this.surfaces.set(command.surfaceId, surface);
    return { ok: true, diagnostics: [] };
  }

  private deleteSurface(command: Extract<Command, { type: "surface:delete" }>): ApplyResult {
    if (!this.surfaces.has(command.surfaceId)) {
      return {
        ok: true,
        diagnostics: [
          diagnostic(
            DIAGNOSTIC_CODES.surfaceNotFound,
            `Surface '${command.surfaceId}' does not exist.`,
            { severity: "warning", surfaceId: command.surfaceId }
          )
        ]
      };
    }

    this.surfaces.delete(command.surfaceId);
    return { ok: true, diagnostics: [] };
  }

  private upsertNodes(command: Extract<Command, { type: "nodes:upsert" }>): ApplyResult {
    const surface = this.surfaces.get(command.surfaceId);
    if (!surface) {
      return {
        ok: false,
        diagnostics: [
          diagnostic(
            DIAGNOSTIC_CODES.surfaceNotFound,
            `Surface '${command.surfaceId}' does not exist.`,
            { surfaceId: command.surfaceId }
          )
        ]
      };
    }

    const diagnostics: Diagnostic[] = [];

    for (const patch of command.nodes) {
      const existing = surface.nodes.get(patch.id);
      const merged = cloneNodePatch(existing, patch);
      if (!merged) {
        diagnostics.push(
          diagnostic(
            DIAGNOSTIC_CODES.missingNodeType,
            `Node '${patch.id}' is missing a type.`,
            { surfaceId: command.surfaceId, nodeId: patch.id }
          )
        );
        continue;
      }

      surface.nodes.set(patch.id, merged);
    }

    if (!surface.nodes.has("root")) {
      diagnostics.push(
        diagnostic(
          DIAGNOSTIC_CODES.rootMissing,
          `Surface '${command.surfaceId}' has no root node (id: root).`,
          { severity: "warning", surfaceId: command.surfaceId }
        )
      );
    }

    const collector = this.getCollector(surface.protocol);
    const pruned = pruneUnreachable(surface, collector);
    for (const removedId of pruned) {
      diagnostics.push(
        diagnostic(
          DIAGNOSTIC_CODES.missingNodeType,
          `Pruned unreachable node '${removedId}' from surface '${command.surfaceId}'.`,
          { severity: "warning", surfaceId: command.surfaceId, nodeId: removedId }
        )
      );
    }

    return {
      ok: diagnostics.every((d) => d.severity !== "error"),
      diagnostics
    };
  }

  private removeNodes(command: Extract<Command, { type: "nodes:remove" }>): ApplyResult {
    const surface = this.surfaces.get(command.surfaceId);
    if (!surface) {
      return {
        ok: false,
        diagnostics: [
          diagnostic(
            DIAGNOSTIC_CODES.surfaceNotFound,
            `Surface '${command.surfaceId}' does not exist.`,
            { surfaceId: command.surfaceId }
          )
        ]
      };
    }

    for (const nodeId of command.nodeIds) {
      surface.nodes.delete(nodeId);
    }

    return { ok: true, diagnostics: [] };
  }

  private setData(command: Extract<Command, { type: "data:set" }>): ApplyResult {
    const surface = this.surfaces.get(command.surfaceId);
    if (!surface) {
      return {
        ok: false,
        diagnostics: [
          diagnostic(
            DIAGNOSTIC_CODES.surfaceNotFound,
            `Surface '${command.surfaceId}' does not exist.`,
            { surfaceId: command.surfaceId }
          )
        ]
      };
    }

    surface.dataModel = setByPointer(surface.dataModel, command.path, command.value);
    return { ok: true, diagnostics: [] };
  }

  private removeData(command: Extract<Command, { type: "data:remove" }>): ApplyResult {
    const surface = this.surfaces.get(command.surfaceId);
    if (!surface) {
      return {
        ok: false,
        diagnostics: [
          diagnostic(
            DIAGNOSTIC_CODES.surfaceNotFound,
            `Surface '${command.surfaceId}' does not exist.`,
            { surfaceId: command.surfaceId }
          )
        ]
      };
    }

    surface.dataModel = removeByPointer(surface.dataModel, command.path);
    return { ok: true, diagnostics: [] };
  }

  private notify(): void {
    this.revision += 1;
    for (const listener of this.listeners) {
      listener();
    }
  }
}
