# UIProtocol

Protocol-agnostic runtime for agent-generated UIs.

[![CI](https://github.com/ConanMcN/uiprotocol/actions/workflows/ci.yml/badge.svg)](https://github.com/ConanMcN/uiprotocol/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

## Overview

UIProtocol is a runtime that lets AI agents generate and update user interfaces through structured messages. It decouples the agent's wire protocol from the rendering layer — any protocol adapter can parse agent messages into a common intermediate representation (IR) of commands, which are then applied to surfaces (UI state containers) through a trust engine and rendered by framework bindings.

## Packages

| Package | Version | Description |
|---------|---------|-------------|
| [`@uiprotocol/core`](./packages/core) | [![npm](https://img.shields.io/npm/v/@uiprotocol/core)](https://www.npmjs.com/package/@uiprotocol/core) | Protocol-agnostic runtime — IR types, trust engine, event system, utilities |
| [`@uiprotocol/a2ui`](./packages/a2ui) | [![npm](https://img.shields.io/npm/v/@uiprotocol/a2ui)](https://www.npmjs.com/package/@uiprotocol/a2ui) | A2UI v0.9 protocol adapter |
| [`@uiprotocol/react`](./packages/react) | [![npm](https://img.shields.io/npm/v/@uiprotocol/react)](https://www.npmjs.com/package/@uiprotocol/react) | React bindings — provider, renderer, hooks |
| [`@uiprotocol/devtools`](./packages/devtools) | [![npm](https://img.shields.io/npm/v/@uiprotocol/devtools)](https://www.npmjs.com/package/@uiprotocol/devtools) | Embeddable devtools panel |
| [`@uiprotocol/json-render`](./packages/json-render) | [![npm](https://img.shields.io/npm/v/@uiprotocol/json-render)](https://www.npmjs.com/package/@uiprotocol/json-render) | json-render protocol adapter |

## Quick Start

```bash
npm install @uiprotocol/core @uiprotocol/react @uiprotocol/a2ui
```

```tsx
import { RuntimeProvider, SurfaceRenderer, useMessages } from "@uiprotocol/react";
import { A2UIAdapter } from "@uiprotocol/a2ui";
import type { AdapterProps } from "@uiprotocol/react";

// Define your component map
const componentsMap = {
  Text: ({ node, resolve }: AdapterProps) => (
    <p>{resolve(node.props.content)}</p>
  ),
};

const adapter = new A2UIAdapter();

function App() {
  return (
    <RuntimeProvider componentsMap={componentsMap}>
      <Chat />
    </RuntimeProvider>
  );
}

function Chat() {
  const { processMessage, surfaces } = useMessages(adapter);

  // Feed agent messages into the runtime
  const handleAgentMessage = (raw: unknown) => processMessage(raw);

  return (
    <>
      {surfaces.map((s) => (
        <SurfaceRenderer key={s.id} surfaceId={s.id} />
      ))}
    </>
  );
}
```

## Architecture

```
Agent Message
     │
     ▼
┌─────────────┐
│  Protocol    │   A2UIAdapter, JsonRenderAdapter, or custom
│  Adapter     │
└──────┬──────┘
       │  Command[]
       ▼
┌─────────────┐
│   Trust      │   Allow/deny policies, consent gates
│   Engine     │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Runtime    │   Surfaces, nodes, data model, events
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   React      │   RuntimeProvider → SurfaceRenderer → your components
│   Bindings   │
└─────────────┘
```

## Key Concepts

- **Surface** — A stateful UI container holding a tree of nodes and a data model
- **UINode** — `{ id, type, children?, checks?, props }` — a single UI element in the tree
- **Command** — A discriminated union describing a state mutation (`surface:create`, `nodes:upsert`, `data:set`, etc.)
- **ProtocolAdapter** — Parses protocol-specific agent messages into `Command[]`
- **TrustEngine** — Evaluates each command against allow/deny policies before it can mutate state
- **FunctionRegistry** — Stores named functions for dynamic value resolution and validation checks

## Development

```bash
pnpm install       # install dependencies
pnpm build         # build all packages
pnpm test          # run tests
pnpm typecheck     # type-check all packages
```

Requires Node >= 18 and pnpm 9.15.0.

## License

[MIT](./LICENSE)
