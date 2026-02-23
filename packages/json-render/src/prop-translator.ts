import type { BoundValue, FunctionCall } from "@uiprotocol/core";

export function translateProps(props: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    result[key] = translateValue(value);
  }
  return result;
}

function translateValue(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(translateValue);
  }

  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;

    // $state expression -> BoundValue
    if (typeof obj.$state === "string") {
      return { path: obj.$state } satisfies BoundValue;
    }

    // $cond expression -> FunctionCall
    if (typeof obj.$cond === "string") {
      const fc: FunctionCall = { call: obj.$cond };
      if (obj.args && typeof obj.args === "object") {
        fc.args = translateProps(obj.args as Record<string, unknown>);
      }
      return fc;
    }

    // Regular object -- recurse
    return translateProps(obj);
  }

  return value;
}
