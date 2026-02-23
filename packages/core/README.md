# @uiprotocol/core

Protocol-agnostic agent UI runtime — IR types, trust engine, event system, and utilities.

[![npm](https://img.shields.io/npm/v/@uiprotocol/core)](https://www.npmjs.com/package/@uiprotocol/core)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

Part of the [UIProtocol](https://github.com/ConanMcN/uiprotocol) monorepo.

## Installation

```bash
npm install @uiprotocol/core
```

## API

### Runtime

The central orchestrator. Manages surfaces, applies commands, and emits events.

```ts
import { Runtime } from "@uiprotocol/core";

const runtime = new Runtime({
  trustPolicy: { defaultPolicy: "allow" },
});

// Parse + apply in one step
const { parseResult, applyResult } = runtime.processMessage(adapter, rawMessage);

// Or apply commands directly
runtime.apply(commands);
runtime.applySingle(command);

// Read state
runtime.getSurfaces();
runtime.getSurface("surface-1");

// Subscribe to changes (works with useSyncExternalStore)
const unsubscribe = runtime.subscribe(() => console.log("changed"));
```

### TrustEngine

Evaluates commands against allow/deny policies per agent.

```ts
runtime.setTrustPolicy({
  defaultPolicy: "deny",
  agents: {
    "agent-1": { allow: ["surface:create", "nodes:upsert"] },
  },
  requireConsent: ["surface:delete"],
});
```

### FunctionRegistry

Named functions for dynamic value resolution and validation checks.

```ts
runtime.functionRegistry.register("isPositive", (args) => {
  return args?.value > 0;
});
```

### EventEmitter

Subscribe to runtime events: `command`, `command:before`, `trust:blocked`, `error`, `warning`.

```ts
runtime.events.on("trust:blocked", (command, reason) => {
  console.warn("Blocked:", reason);
});
```

### Types

Core type definitions used across all UIProtocol packages:

| Type | Description |
|------|-------------|
| `Surface` | State container with `nodes`, `dataModel`, and `protocol` tag |
| `UINode` | `{ id, type, children?, checks?, props }` |
| `Command` | Discriminated union: `surface:create`, `surface:delete`, `nodes:upsert`, `nodes:remove`, `data:set`, `data:remove` |
| `ProtocolAdapter` | `{ protocol: string; parse(raw): ParseResult<Command[]> }` |
| `TrustConfig` | Trust policy with `agents`, `requireConsent`, `defaultPolicy` |
| `TrustVerdict` | `{ allowed: true }` or `{ allowed: false; reason: string }` |
| `ParseResult<T>` | `{ ok: true; value: T; warnings }` or `{ ok: false; errors; warnings }` |
| `Diagnostic` | `{ code, message, severity, surfaceId?, nodeId? }` |

### Utilities

- `setByPointer(obj, path, value)` / `removeByPointer(obj, path)` — JSON Pointer operations
- `resolveDynamicValue(value, context)` — Resolves `BoundValue` and `FunctionCall` references
- `validateValue(options, registry)` — Runs validation checks and pattern matching
- `CommandLog` — Append-only log of commands with trust verdicts
- `defaultChildRefCollector(node)` — Collects child references from `node.children`

## License

[MIT](./LICENSE)
