import {
  DIAGNOSTIC_CODES,
  diagnostic
} from "./diagnostics";
import type { A2UIDiagnostic } from "./types";

export type FunctionExecutor = (args: Record<string, unknown>) => unknown;

function toArray(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }
  if (value === undefined || value === null) {
    return [];
  }
  return [value];
}

function asNumber(value: unknown): number {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  return Number.NaN;
}

function buildDefaultRegistry(): Record<string, FunctionExecutor> {
  return {
    required: ({ value }) => {
      if (value === null || value === undefined) {
        return false;
      }
      if (typeof value === "string") {
        return value.trim().length > 0;
      }
      if (Array.isArray(value)) {
        return value.length > 0;
      }
      return true;
    },
    regex: ({ value, pattern, flags }) => {
      if (typeof value !== "string" || typeof pattern !== "string") {
        return false;
      }
      try {
        return new RegExp(pattern, typeof flags === "string" ? flags : undefined).test(
          value
        );
      } catch {
        return false;
      }
    },
    email: ({ value }) => {
      if (typeof value !== "string") {
        return false;
      }
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    },
    concat: ({ values, separator }) => {
      const glue = typeof separator === "string" ? separator : "";
      return toArray(values).map((entry) => String(entry ?? "")).join(glue);
    },
    formatString: ({ template, values }) => {
      if (typeof template !== "string") {
        return "";
      }

      if (!values || typeof values !== "object") {
        return template;
      }

      return template.replace(/\{([^}]+)\}/g, (_, key: string) => {
        const replacement = (values as Record<string, unknown>)[key.trim()];
        return replacement === undefined || replacement === null
          ? ""
          : String(replacement);
      });
    },
    formatNumber: ({ value, locales, options }) => {
      const numeric = asNumber(value);
      if (Number.isNaN(numeric)) {
        return "";
      }
      const parsedLocales =
        typeof locales === "string" || Array.isArray(locales)
          ? (locales as string | string[])
          : undefined;
      const parsedOptions =
        options && typeof options === "object"
          ? (options as Intl.NumberFormatOptions)
          : undefined;
      try {
        return new Intl.NumberFormat(parsedLocales, parsedOptions).format(numeric);
      } catch {
        return String(numeric);
      }
    },
    and: ({ values }) => toArray(values).every(Boolean),
    or: ({ values }) => toArray(values).some(Boolean),
    not: ({ value }) => !Boolean(value),
    equals: ({ left, right }) => left === right,
    greaterThan: ({ left, right }) => asNumber(left) > asNumber(right),
    lessThan: ({ left, right }) => asNumber(left) < asNumber(right)
  };
}

export class FunctionRegistry {
  private readonly handlers = new Map<string, FunctionExecutor>();
  private readonly builtInNames: ReadonlySet<string>;
  private readonly onBuiltInOverride?: (name: string) => void;

  constructor(
    entries?: Record<string, FunctionExecutor>,
    options?: { onBuiltInOverride?: (name: string) => void }
  ) {
    const defaults = buildDefaultRegistry();
    for (const [name, handler] of Object.entries(defaults)) {
      this.handlers.set(name, handler);
    }
    this.builtInNames = new Set(this.handlers.keys());
    this.onBuiltInOverride = options?.onBuiltInOverride;

    if (entries) {
      for (const [name, handler] of Object.entries(entries)) {
        if (this.builtInNames.has(name)) {
          this.onBuiltInOverride?.(name);
        }
        this.handlers.set(name, handler);
      }
    }
  }

  has(name: string): boolean {
    return this.handlers.has(name);
  }

  register(name: string, handler: FunctionExecutor): void {
    if (this.builtInNames.has(name)) {
      this.onBuiltInOverride?.(name);
    }
    this.handlers.set(name, handler);
  }

  execute(name: string, args: Record<string, unknown>): unknown {
    const handler = this.handlers.get(name);
    if (!handler) {
      const error = diagnostic(
        DIAGNOSTIC_CODES.unknownFunction,
        `Unknown function: ${name}`
      );
      throw Object.assign(new Error(error.message), { diagnostic: error });
    }

    try {
      return handler(args);
    } catch (cause) {
      const error = diagnostic(
        DIAGNOSTIC_CODES.functionExecutionFailed,
        `Function ${name} failed to execute.`,
        {
          details: {
            cause: cause instanceof Error ? cause.message : String(cause)
          }
        }
      );
      throw Object.assign(new Error(error.message), { diagnostic: error });
    }
  }
}

export function getFunctionDiagnostic(error: unknown): A2UIDiagnostic | null {
  if (
    error &&
    typeof error === "object" &&
    "diagnostic" in error &&
    (error as { diagnostic?: unknown }).diagnostic &&
    typeof (error as { diagnostic?: unknown }).diagnostic === "object"
  ) {
    return (error as { diagnostic: A2UIDiagnostic }).diagnostic;
  }

  return null;
}
