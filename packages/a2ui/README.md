# @uiprotocol/a2ui

A2UI v0.9 protocol adapter for `@uiprotocol/core`.

[![npm](https://img.shields.io/npm/v/@uiprotocol/a2ui)](https://www.npmjs.com/package/@uiprotocol/a2ui)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

Part of the [UIProtocol](https://github.com/ConanMcN/uiprotocol) monorepo.

## Installation

```bash
npm install @uiprotocol/a2ui @uiprotocol/core
```

## API

### A2UIAdapter

Implements `ProtocolAdapter` to parse A2UI v0.9 messages into UIProtocol commands.

```ts
import { A2UIAdapter } from "@uiprotocol/a2ui";

const adapter = new A2UIAdapter();
// adapter.protocol === "a2ui"

const result = adapter.parse(rawMessage);
if (result.ok) {
  console.log(result.value); // Command[]
}
```

### Supported Message Types

| A2UI Message | Generated Command |
|-------------|-------------------|
| `createSurface` | `surface:create` |
| `updateComponents` | `nodes:upsert` |
| `updateDataModel` | `data:set` or `data:remove` |
| `deleteSurface` | `surface:delete` |

### Usage with React

```tsx
import { useMessages } from "@uiprotocol/react";
import { A2UIAdapter } from "@uiprotocol/a2ui";

const adapter = new A2UIAdapter();

function Chat() {
  const { processMessage, surfaces } = useMessages(adapter);

  const handleAgentMessage = (raw: unknown) => {
    processMessage(raw);
  };

  // ...
}
```

### Utilities

- `parseMessage(raw)` — Validates and parses a raw A2UI message
- `getMessageType(raw)` — Returns the message type string without full parsing

## License

[MIT](./LICENSE)
