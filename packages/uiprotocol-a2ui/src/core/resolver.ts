import { FunctionRegistry } from "./function-registry";
import { resolveByPointer, resolvePointerPath } from "./pointer";
import type { BoundValue, DynamicValue, FunctionCall } from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function isBoundValue(value: unknown): value is BoundValue {
  return isRecord(value) && typeof value.path === "string";
}

export function isFunctionCall(value: unknown): value is FunctionCall {
  return isRecord(value) && typeof value.call === "string";
}

export interface ResolveOptions {
  dataModel: unknown;
  scopePath?: string;
  functionRegistry?: FunctionRegistry;
  /** @internal Tracks visited objects to prevent infinite recursion on circular references. */
  _visited?: Set<unknown>;
}

function resolveFunctionArgs(
  args: Record<string, unknown> | undefined,
  options: ResolveOptions
): Record<string, unknown> {
  if (!args) {
    return {};
  }

  const resolved: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(args)) {
    resolved[key] = resolveUnknownValue(value, options);
  }
  return resolved;
}

export function resolveFunctionCall(
  functionCall: FunctionCall,
  options: ResolveOptions
): unknown {
  const registry = options.functionRegistry ?? new FunctionRegistry();
  const args = resolveFunctionArgs(functionCall.args, options);
  return registry.execute(functionCall.call, args);
}

export function resolveDynamicValue<T>(
  value: DynamicValue<T> | T,
  options: ResolveOptions
): T | undefined {
  if (isBoundValue(value)) {
    const absolutePath = resolvePointerPath(value.path, options.scopePath ?? "/");
    return resolveByPointer<T>(options.dataModel, absolutePath);
  }

  if (isFunctionCall(value)) {
    return resolveFunctionCall(value, options) as T;
  }

  return value as T;
}

export function resolveUnknownValue(
  value: unknown,
  options: ResolveOptions
): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => resolveUnknownValue(entry, options));
  }

  if (isBoundValue(value) || isFunctionCall(value)) {
    return resolveDynamicValue(value, options);
  }

  if (!isRecord(value)) {
    return value;
  }

  const visited = options._visited ?? new Set<unknown>();
  if (visited.has(value)) {
    return undefined;
  }
  visited.add(value);

  const resolved: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    resolved[key] = resolveUnknownValue(entry, { ...options, _visited: visited });
  }
  return resolved;
}
