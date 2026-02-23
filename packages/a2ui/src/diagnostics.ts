import { diagnostic as coreDiagnostic } from "@uiprotocol/core";
import type { Diagnostic, ParseResult } from "@uiprotocol/core";

export const A2UI_DIAGNOSTIC_CODES = {
  invalidJson: "A2UI_INVALID_JSON",
  invalidEnvelope: "A2UI_INVALID_ENVELOPE",
  unsupportedVersion: "A2UI_UNSUPPORTED_VERSION",
  missingField: "A2UI_MISSING_FIELD",
  invalidType: "A2UI_INVALID_TYPE",
  unknownMessageType: "A2UI_UNKNOWN_MESSAGE_TYPE",
  surfaceNotFound: "A2UI_SURFACE_NOT_FOUND",
  missingComponentType: "A2UI_MISSING_COMPONENT_TYPE",
  rootMissing: "A2UI_ROOT_MISSING",
} as const;

export { coreDiagnostic as diagnostic };

export function parseSuccess<T>(
  value: T,
  warnings: Diagnostic[] = []
): ParseResult<T> {
  return { ok: true, value, warnings };
}

export function parseFailure<T>(
  errors: Diagnostic[],
  warnings: Diagnostic[] = []
): ParseResult<T> {
  return { ok: false, errors, warnings };
}
