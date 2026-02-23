# @uiprotocol/json-render

json-render protocol adapter for `@uiprotocol/core`.

[![npm](https://img.shields.io/npm/v/@uiprotocol/json-render)](https://www.npmjs.com/package/@uiprotocol/json-render)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

Part of the [UIProtocol](https://github.com/ConanMcN/uiprotocol) monorepo.

## Installation

```bash
npm install @uiprotocol/json-render @uiprotocol/core
```

## API

### JsonRenderAdapter

Implements `ProtocolAdapter` to parse a json-render spec into UIProtocol commands. A single spec produces a `surface:create`, `nodes:upsert`, and optionally a `data:set` command.

```ts
import { JsonRenderAdapter } from "@uiprotocol/json-render";

const adapter = new JsonRenderAdapter();
// adapter.protocol === "json-render"

const result = adapter.parse(spec);
if (result.ok) {
  console.log(result.value); // Command[]
}
```

### Spec Format

A json-render spec describes a full UI surface as a nested element tree:

```json
{
  "surfaceId": "my-surface",
  "state": { "count": 0 },
  "root": {
    "type": "Container",
    "children": [
      {
        "type": "Text",
        "content": "Hello, world!"
      },
      {
        "type": "Button",
        "label": "Click me",
        "visible": { "$cond": "isLoggedIn" }
      }
    ]
  }
}
```

### Types

| Type | Description |
|------|-------------|
| `JsonRenderSpec` | `{ surfaceId?, state?, root: JsonRenderElement }` |
| `JsonRenderElement` | `{ type, id?, children?, visible?, ...props }` |
| `JsonRenderCondition` | `{ $cond: string, args?: Record<string, unknown> }` |

### Conditional Visibility

Elements can use `visible` with a `$cond` reference to a registered function. The element is only rendered when the function returns a truthy value.

```json
{
  "type": "Alert",
  "message": "Low stock",
  "visible": { "$cond": "isLowStock", "args": { "threshold": 5 } }
}
```

### Utilities

- `translateProps(props)` — Translates json-render props to UINode props
- `visibilityToFunctionCall(condition)` — Converts a `$cond` visibility to a `FunctionCall`
- `jsonRenderChildRefCollector` — Child ref collector for the json-render protocol

## License

[MIT](./LICENSE)
