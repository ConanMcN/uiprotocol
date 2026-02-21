import type { A2UIDiagnostic, ParseResult } from "./types";

export const DIAGNOSTIC_CODES = {
  invalidJson: "A2UI_INVALID_JSON",
  invalidEnvelope: "A2UI_INVALID_ENVELOPE",
  unsupportedVersion: "A2UI_UNSUPPORTED_VERSION",
  missingField: "A2UI_MISSING_FIELD",
  invalidType: "A2UI_INVALID_TYPE",
  unknownMessageType: "A2UI_UNKNOWN_MESSAGE_TYPE",
  surfaceNotFound: "A2UI_SURFACE_NOT_FOUND",
  missingComponentType: "A2UI_MISSING_COMPONENT_TYPE",
  rootMissing: "A2UI_ROOT_MISSING",
  invalidPointer: "A2UI_INVALID_POINTER",
  unknownFunction: "A2UI_UNKNOWN_FUNCTION",
  functionExecutionFailed: "A2UI_FUNCTION_EXECUTION_FAILED",
  validationCheckFailed: "A2UI_VALIDATION_CHECK_FAILED",
  validationRegexFailed: "A2UI_VALIDATION_REGEX_FAILED",
  unknownComponent: "A2UI_UNKNOWN_COMPONENT",
  hostEffectDropped: "A2UI_HOST_EFFECT_DROPPED",
  renderFailed: "A2UI_RENDER_FAILED"
} as const;

export function diagnostic(
  code: string,
  message: string,
  overrides: Partial<Omit<A2UIDiagnostic, "code" | "message">> = {}
): A2UIDiagnostic {
  return {
    code,
    message,
    severity: overrides.severity ?? "error",
    ...overrides
  };
}

export function parseSuccess<T>(
  value: T,
  warnings: A2UIDiagnostic[] = []
): ParseResult<T> {
  return { ok: true, value, warnings };
}

export function parseFailure<T>(
  errors: A2UIDiagnostic[],
  warnings: A2UIDiagnostic[] = []
): ParseResult<T> {
  return { ok: false, errors, warnings };
}
