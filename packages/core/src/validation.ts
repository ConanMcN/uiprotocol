import {
  DIAGNOSTIC_CODES
} from "./diagnostics";
import { FunctionRegistry } from "./function-registry";
import { resolveUnknownValue } from "./resolver";
import type {
  ClientError,
  ValidateValueOptions,
  ValidationResult
} from "./types";

function toClientError(
  code: string,
  message: string,
  details?: Record<string, unknown>
): ClientError {
  return { code, message, details };
}

export function validateValue(
  options: ValidateValueOptions,
  functionRegistry = new FunctionRegistry()
): ValidationResult {
  const errors: ClientError[] = [];

  if (options.pattern && typeof options.value === "string") {
    try {
      const regex = new RegExp(options.pattern);
      if (!regex.test(options.value)) {
        errors.push(
          toClientError(
            DIAGNOSTIC_CODES.validationRegexFailed,
            "Value does not match required pattern.",
            {
              pattern: options.pattern
            }
          )
        );
      }
    } catch {
      errors.push(
        toClientError(
          DIAGNOSTIC_CODES.validationRegexFailed,
          `Invalid regex pattern: ${options.pattern}`,
          {
            pattern: options.pattern
          }
        )
      );
    }
  }

  if (options.checks?.length) {
    for (const check of options.checks) {
      const rawResolved = resolveUnknownValue(
        {
          ...(check.args ?? {}),
          value: options.value
        },
        {
          dataModel: options.dataModel,
          scopePath: options.scopePath,
          functionRegistry
        }
      );

      const resolvedArgs: Record<string, unknown> =
        rawResolved && typeof rawResolved === "object" && !Array.isArray(rawResolved)
          ? (rawResolved as Record<string, unknown>)
          : { value: options.value };

      try {
        const result = functionRegistry.execute(check.call, resolvedArgs);
        if (!result) {
          errors.push(
            toClientError(
              DIAGNOSTIC_CODES.validationCheckFailed,
              `Validation check '${check.call}' failed.`,
              {
                call: check.call,
                resolvedArgs
              }
            )
          );
        }
      } catch (error) {
        errors.push(
          toClientError(
            DIAGNOSTIC_CODES.functionExecutionFailed,
            `Validation check '${check.call}' threw an error.`,
            {
              call: check.call,
              resolvedArgs,
              cause: error instanceof Error ? error.message : String(error)
            }
          )
        );
      }
    }
  }

  return {
    ok: errors.length === 0,
    errors
  };
}
