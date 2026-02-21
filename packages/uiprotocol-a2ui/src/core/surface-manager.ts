import {
  DIAGNOSTIC_CODES,
  diagnostic
} from "./diagnostics";
import { collectChildComponentIds } from "./child-refs";
import { getMessageType } from "./message-parser";
import { removeByPointer, setByPointer } from "./pointer";
import type {
  A2UIComponent,
  A2UIDiagnostic,
  A2UIMessage,
  A2UISurface,
  ApplyResult,
  CreateSurfaceMessage,
  DeleteSurfaceMessage,
  UpdateComponentsMessage,
  UpdateDataModelMessage
} from "./types";

type Listener = () => void;

export interface SurfaceManagerOptions {
  onDiagnostic?: (diagnostic: A2UIDiagnostic) => void;
}

function emitDiagnostics(
  diagnostics: A2UIDiagnostic[],
  onDiagnostic?: (diagnostic: A2UIDiagnostic) => void
): void {
  if (!onDiagnostic) {
    return;
  }

  for (const entry of diagnostics) {
    onDiagnostic(entry);
  }
}

function cloneComponentPatch(
  existing: A2UIComponent | undefined,
  patch: Partial<A2UIComponent> & Pick<A2UIComponent, "id">
): A2UIComponent | null {
  const nextComponentType =
    typeof patch.component === "string" && patch.component.length > 0
      ? patch.component
      : existing?.component;

  if (!nextComponentType) {
    return null;
  }

  return {
    ...(existing ?? {}),
    ...patch,
    id: patch.id,
    component: nextComponentType
  };
}

function pruneUnreachable(surface: A2UISurface): string[] {
  const root = surface.components.get("root");
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
    const component = surface.components.get(currentId);
    if (!component) {
      continue;
    }

    const children = collectChildComponentIds(component);
    for (const childId of children) {
      if (!visited.has(childId)) {
        queue.push(childId);
      }
    }
  }

  const removed: string[] = [];
  for (const id of surface.components.keys()) {
    if (!visited.has(id)) {
      surface.components.delete(id);
      removed.push(id);
    }
  }

  return removed;
}

export class SurfaceManager {
  private readonly surfaces = new Map<string, A2UISurface>();
  private readonly listeners = new Set<Listener>();
  private revision = 0;

  constructor(private readonly options: SurfaceManagerOptions = {}) {}

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  getSurface(surfaceId: string): A2UISurface | undefined {
    return this.surfaces.get(surfaceId);
  }

  getSurfaces(): A2UISurface[] {
    return Array.from(this.surfaces.values());
  }

  getRevision(): number {
    return this.revision;
  }

  createSurface(message: CreateSurfaceMessage): ApplyResult {
    const { surfaceId, catalogId, theme } = message.createSurface;

    const surface: A2UISurface = {
      id: surfaceId,
      catalogId,
      theme,
      components: new Map<string, A2UIComponent>(),
      dataModel: {}
    };

    this.surfaces.set(surfaceId, surface);
    this.notify();

    return {
      ok: true,
      diagnostics: []
    };
  }

  updateComponents(message: UpdateComponentsMessage): ApplyResult {
    const { surfaceId, components } = message.updateComponents;
    const surface = this.surfaces.get(surfaceId);

    if (!surface) {
      const diagnostics = [
        diagnostic(
          DIAGNOSTIC_CODES.surfaceNotFound,
          `Surface '${surfaceId}' does not exist.`,
          { surfaceId }
        )
      ];
      emitDiagnostics(diagnostics, this.options.onDiagnostic);
      return { ok: false, diagnostics };
    }

    const diagnostics: A2UIDiagnostic[] = [];

    for (const patch of components) {
      const existing = surface.components.get(patch.id);
      const merged = cloneComponentPatch(existing, patch);
      if (!merged) {
        diagnostics.push(
          diagnostic(
            DIAGNOSTIC_CODES.missingComponentType,
            `Component '${patch.id}' is missing a component type.`,
            {
              surfaceId,
              componentId: patch.id
            }
          )
        );
        continue;
      }

      surface.components.set(patch.id, merged);
    }

    if (!surface.components.has("root")) {
      diagnostics.push(
        diagnostic(
          DIAGNOSTIC_CODES.rootMissing,
          `Surface '${surfaceId}' has no root component (id: root).`,
          {
            severity: "warning",
            surfaceId
          }
        )
      );
    }

    pruneUnreachable(surface);
    this.notify();

    emitDiagnostics(diagnostics, this.options.onDiagnostic);
    return {
      ok: diagnostics.every((entry) => entry.severity !== "error"),
      diagnostics
    };
  }

  updateDataModel(message: UpdateDataModelMessage): ApplyResult {
    const { surfaceId } = message.updateDataModel;
    const surface = this.surfaces.get(surfaceId);

    if (!surface) {
      const diagnostics = [
        diagnostic(
          DIAGNOSTIC_CODES.surfaceNotFound,
          `Surface '${surfaceId}' does not exist.`,
          { surfaceId }
        )
      ];
      emitDiagnostics(diagnostics, this.options.onDiagnostic);
      return {
        ok: false,
        diagnostics
      };
    }

    const path = message.updateDataModel.path ?? "/";
    const hasValue = Object.prototype.hasOwnProperty.call(
      message.updateDataModel,
      "value"
    );

    surface.dataModel = hasValue
      ? setByPointer(surface.dataModel, path, message.updateDataModel.value)
      : removeByPointer(surface.dataModel, path);

    this.notify();
    return {
      ok: true,
      diagnostics: []
    };
  }

  deleteSurface(message: DeleteSurfaceMessage): ApplyResult {
    const { surfaceId } = message.deleteSurface;

    if (!this.surfaces.has(surfaceId)) {
      const diagnostics = [
        diagnostic(
          DIAGNOSTIC_CODES.surfaceNotFound,
          `Surface '${surfaceId}' does not exist.`,
          {
            surfaceId,
            severity: "warning"
          }
        )
      ];

      emitDiagnostics(diagnostics, this.options.onDiagnostic);
      return {
        ok: true,
        diagnostics
      };
    }

    this.surfaces.delete(surfaceId);
    this.notify();

    return {
      ok: true,
      diagnostics: []
    };
  }

  apply(message: A2UIMessage): ApplyResult {
    const messageType = getMessageType(message);

    if (messageType === "createSurface" && "createSurface" in message) {
      return this.createSurface(message);
    }

    if (messageType === "updateComponents" && "updateComponents" in message) {
      return this.updateComponents(message);
    }

    if (messageType === "updateDataModel" && "updateDataModel" in message) {
      return this.updateDataModel(message);
    }

    if (messageType === "deleteSurface" && "deleteSurface" in message) {
      return this.deleteSurface(message);
    }

    return {
      ok: false,
      diagnostics: [
        diagnostic(DIAGNOSTIC_CODES.unknownMessageType, "Unhandled message type.")
      ]
    };
  }

  private notify(): void {
    this.revision += 1;
    for (const listener of this.listeners) {
      listener();
    }
  }
}

export function createSurfaceManager(options?: SurfaceManagerOptions): SurfaceManager {
  return new SurfaceManager(options);
}
