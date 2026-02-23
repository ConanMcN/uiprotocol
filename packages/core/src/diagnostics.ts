import type { Diagnostic, ParseResult } from "./types";

export const DIAGNOSTIC_CODES = {
  invalidJson: "CORE_INVALID_JSON",
  invalidEnvelope: "CORE_INVALID_ENVELOPE",
  unsupportedVersion: "CORE_UNSUPPORTED_VERSION",
  missingField: "CORE_MISSING_FIELD",
  invalidType: "CORE_INVALID_TYPE",
  unknownMessageType: "CORE_UNKNOWN_MESSAGE_TYPE",
  surfaceNotFound: "CORE_SURFACE_NOT_FOUND",
  missingNodeType: "CORE_MISSING_NODE_TYPE",
  rootMissing: "CORE_ROOT_MISSING",
  invalidPointer: "CORE_INVALID_POINTER",
  unknownFunction: "CORE_UNKNOWN_FUNCTION",
  functionExecutionFailed: "CORE_FUNCTION_EXECUTION_FAILED",
  validationCheckFailed: "CORE_VALIDATION_CHECK_FAILED",
  validationRegexFailed: "CORE_VALIDATION_REGEX_FAILED",
  unknownComponent: "CORE_UNKNOWN_COMPONENT",
  hostEffectDropped: "CORE_HOST_EFFECT_DROPPED",
  renderFailed: "CORE_RENDER_FAILED",
  trustViolation: "CORE_TRUST_VIOLATION",
  commandRejected: "CORE_COMMAND_REJECTED"
} as const;

export function diagnostic(
  code: string,
  message: string,
  overrides: Partial<Omit<Diagnostic, "code" | "message">> = {}
): Diagnostic {
  return {
    code,
    message,
    severity: overrides.severity ?? "error",
    ...overrides
  };
}

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
