import { collectChildComponentIds } from "./child-refs";
import {
  DIAGNOSTIC_CODES,
  diagnostic,
  parseFailure,
  parseSuccess
} from "./diagnostics";
import type {
  A2UIComponent,
  A2UIMessage,
  A2UIMessageType,
  ParseResult,
  UpdateComponentsPayload,
  UpdateDataModelPayload
} from "./types";

const MESSAGE_TYPES: A2UIMessageType[] = [
  "createSurface",
  "updateComponents",
  "updateDataModel",
  "deleteSurface"
];

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function parseJson(raw: string): ParseResult<unknown> {
  try {
    return parseSuccess(JSON.parse(raw));
  } catch {
    return parseFailure([
      diagnostic(
        DIAGNOSTIC_CODES.invalidJson,
        "Message is not valid JSON.",
        {
          severity: "error"
        }
      )
    ]);
  }
}

function requireString(
  object: Record<string, unknown>,
  field: string
): string | undefined {
  const value = object[field];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function validateUpdateComponents(
  payload: Record<string, unknown>
): ParseResult<UpdateComponentsPayload> {
  const surfaceId = requireString(payload, "surfaceId");
  if (!surfaceId) {
    return parseFailure([
      diagnostic(
        DIAGNOSTIC_CODES.missingField,
        "updateComponents.surfaceId is required."
      )
    ]);
  }

  if (!Array.isArray(payload.components)) {
    return parseFailure([
      diagnostic(
        DIAGNOSTIC_CODES.invalidType,
        "updateComponents.components must be an array."
      )
    ]);
  }

  const warnings = [];

  for (let index = 0; index < payload.components.length; index += 1) {
    const patch = payload.components[index];
    if (!isObject(patch) || typeof patch.id !== "string" || patch.id.length === 0) {
      return parseFailure([
        diagnostic(
          DIAGNOSTIC_CODES.missingField,
          `updateComponents.components[${index}] requires a non-empty id.`
        )
      ]);
    }

    const childIds = collectChildComponentIds(patch as A2UIComponent);
    if (childIds.includes(patch.id as string)) {
      warnings.push(
        diagnostic(
          DIAGNOSTIC_CODES.invalidEnvelope,
          `Component '${patch.id}' references itself as a child.`,
          { severity: "warning", componentId: patch.id as string }
        )
      );
    }
  }

  return parseSuccess(payload as unknown as UpdateComponentsPayload, warnings);
}

function validateUpdateDataModel(
  payload: Record<string, unknown>
): ParseResult<UpdateDataModelPayload> {
  const surfaceId = requireString(payload, "surfaceId");
  if (!surfaceId) {
    return parseFailure([
      diagnostic(
        DIAGNOSTIC_CODES.missingField,
        "updateDataModel.surfaceId is required."
      )
    ]);
  }

  if (
    payload.path !== undefined &&
    (typeof payload.path !== "string" || payload.path.length === 0)
  ) {
    return parseFailure([
      diagnostic(
        DIAGNOSTIC_CODES.invalidType,
        "updateDataModel.path must be a non-empty string when provided."
      )
    ]);
  }

  return parseSuccess(payload as unknown as UpdateDataModelPayload);
}

export function getMessageType(message: A2UIMessage): A2UIMessageType {
  if ("createSurface" in message) {
    return "createSurface";
  }
  if ("updateComponents" in message) {
    return "updateComponents";
  }
  if ("updateDataModel" in message) {
    return "updateDataModel";
  }
  return "deleteSurface";
}

export function parseMessage(raw: unknown): ParseResult<A2UIMessage> {
  const initial = typeof raw === "string" ? parseJson(raw) : parseSuccess(raw);
  if (!initial.ok) {
    return initial;
  }

  const value = initial.value;
  if (!isObject(value)) {
    return parseFailure([
      diagnostic(DIAGNOSTIC_CODES.invalidEnvelope, "Message must be an object.")
    ]);
  }

  if (value.version !== "v0.9") {
    return parseFailure([
      diagnostic(
        DIAGNOSTIC_CODES.unsupportedVersion,
        "Only version v0.9 is supported in this runtime."
      )
    ]);
  }

  const presentTypes = MESSAGE_TYPES.filter((type) => type in value);
  if (presentTypes.length !== 1) {
    return parseFailure([
      diagnostic(
        DIAGNOSTIC_CODES.invalidEnvelope,
        "Message envelope must include exactly one operation key."
      )
    ]);
  }

  const messageType = presentTypes[0];
  const payload = value[messageType];

  if (!isObject(payload)) {
    return parseFailure([
      diagnostic(
        DIAGNOSTIC_CODES.invalidEnvelope,
        `${messageType} payload must be an object.`
      )
    ]);
  }

  switch (messageType) {
    case "createSurface": {
      const surfaceId = requireString(payload, "surfaceId");
      if (!surfaceId) {
        return parseFailure([
          diagnostic(
            DIAGNOSTIC_CODES.missingField,
            "createSurface.surfaceId is required."
          )
        ]);
      }
      return parseSuccess(value as unknown as A2UIMessage);
    }
    case "updateComponents": {
      const validated = validateUpdateComponents(payload);
      if (!validated.ok) {
        return validated;
      }
      return parseSuccess(value as unknown as A2UIMessage, validated.warnings);
    }
    case "updateDataModel": {
      const validated = validateUpdateDataModel(payload);
      if (!validated.ok) {
        return validated;
      }
      return parseSuccess(value as unknown as A2UIMessage);
    }
    case "deleteSurface": {
      const surfaceId = requireString(payload, "surfaceId");
      if (!surfaceId) {
        return parseFailure([
          diagnostic(
            DIAGNOSTIC_CODES.missingField,
            "deleteSurface.surfaceId is required."
          )
        ]);
      }
      return parseSuccess(value as unknown as A2UIMessage);
    }
    default:
      return parseFailure([
        diagnostic(
          DIAGNOSTIC_CODES.unknownMessageType,
          "Unknown message operation key."
        )
      ]);
  }
}
