import { DIAGNOSTIC_CODES } from "./diagnostics";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function decodeToken(token: string): string {
  return token.replace(/~1/g, "/").replace(/~0/g, "~");
}

function encodeToken(token: string): string {
  return token.replace(/~/g, "~0").replace(/\//g, "~1");
}

function assertPointer(pointer: string): void {
  if (!pointer) {
    return;
  }

  if (!pointer.startsWith("/")) {
    throw new Error(`${DIAGNOSTIC_CODES.invalidPointer}: Pointer must start with '/'.`);
  }
}

function pointerToTokens(pointer: string): string[] {
  if (!pointer || pointer === "/") {
    return [];
  }

  assertPointer(pointer);
  return pointer
    .slice(1)
    .split("/")
    .filter((token) => token.length > 0)
    .map(decodeToken);
}

function normalizeAbsolutePointer(pointer: string): string {
  if (!pointer || pointer === "/") {
    return "/";
  }

  assertPointer(pointer);
  const tokens = pointerToTokens(pointer);
  return tokens.length === 0 ? "/" : `/${tokens.map(encodeToken).join("/")}`;
}

function normalizeBasePath(basePath?: string): string[] {
  const base = normalizeAbsolutePointer(basePath ?? "/");
  return pointerToTokens(base);
}

export function resolvePointerPath(path: string, basePath = "/"): string {
  if (!path || path === "/") {
    return "/";
  }

  if (path.startsWith("/")) {
    return normalizeAbsolutePointer(path);
  }

  const tokens = normalizeBasePath(basePath);
  const rawSegments = path.split("/");

  for (const segment of rawSegments) {
    if (!segment || segment === ".") {
      continue;
    }

    if (segment === "..") {
      tokens.pop();
      continue;
    }

    tokens.push(segment);
  }

  return tokens.length === 0 ? "/" : `/${tokens.map(encodeToken).join("/")}`;
}

export function resolveByPointer<T = unknown>(
  model: unknown,
  pointer: string,
  options?: { basePath?: string }
): T | undefined {
  const absolutePointer = resolvePointerPath(pointer, options?.basePath ?? "/");
  const tokens = pointerToTokens(absolutePointer);
  let current: unknown = model;

  for (const token of tokens) {
    if (Array.isArray(current)) {
      const index = Number(token);
      if (!Number.isInteger(index)) {
        return undefined;
      }
      current = current[index];
      continue;
    }

    if (!isRecord(current)) {
      return undefined;
    }

    current = current[token];
  }

  return current as T;
}

function cloneContainerForKey(
  current: unknown,
  key: string
): Record<string, unknown> | unknown[] {
  if (Array.isArray(current)) {
    return [...current];
  }

  if (isRecord(current)) {
    return { ...current };
  }

  return Number.isInteger(Number(key)) ? [] : {};
}

function setRecursive(current: unknown, tokens: string[], value: unknown): unknown {
  if (tokens.length === 0) {
    return value;
  }

  const [head, ...tail] = tokens;
  const container = cloneContainerForKey(current, head);

  if (Array.isArray(container)) {
    const index = Number(head);
    container[index] = setRecursive(container[index], tail, value);
    return container;
  }

  container[head] = setRecursive(container[head], tail, value);
  return container;
}

export function setByPointer(
  model: unknown,
  pointer: string,
  value: unknown,
  options?: { basePath?: string }
): unknown {
  const absolutePointer = resolvePointerPath(pointer, options?.basePath ?? "/");
  const tokens = pointerToTokens(absolutePointer);
  if (tokens.length === 0) {
    return value;
  }

  return setRecursive(model, tokens, value);
}

function removeRecursive(current: unknown, tokens: string[]): unknown {
  if (tokens.length === 0) {
    return {};
  }

  const [head, ...tail] = tokens;

  if (Array.isArray(current)) {
    const clone = [...current];
    const index = Number(head);

    if (!Number.isInteger(index)) {
      return clone;
    }

    if (tail.length === 0) {
      clone.splice(index, 1);
      return clone;
    }

    clone[index] = removeRecursive(clone[index], tail);
    return clone;
  }

  if (!isRecord(current)) {
    return current;
  }

  const clone: Record<string, unknown> = { ...current };

  if (tail.length === 0) {
    delete clone[head];
    return clone;
  }

  clone[head] = removeRecursive(clone[head], tail);
  return clone;
}

export function removeByPointer(
  model: unknown,
  pointer: string,
  options?: { basePath?: string }
): unknown {
  const absolutePointer = resolvePointerPath(pointer, options?.basePath ?? "/");
  const tokens = pointerToTokens(absolutePointer);
  if (tokens.length === 0) {
    return {};
  }

  return removeRecursive(model, tokens);
}
