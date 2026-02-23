# @uiprotocol/devtools

Embeddable devtools panel for inspecting `@uiprotocol/core` runtime state.

[![npm](https://img.shields.io/npm/v/@uiprotocol/devtools)](https://www.npmjs.com/package/@uiprotocol/devtools)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

Part of the [UIProtocol](https://github.com/ConanMcN/uiprotocol) monorepo.

## Installation

```bash
npm install @uiprotocol/devtools @uiprotocol/core @uiprotocol/react
```

Requires `react` >= 18 and `react-dom` >= 18 as peer dependencies.

## API

### DevToolsPanel

Drop-in panel component that reads from the runtime context.

```tsx
import { DevToolsPanel } from "@uiprotocol/devtools";

<DevToolsPanel defaultTab="surfaces" />
```

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `defaultTab` | `"surfaces" \| "commands" \| "events" \| "trust"` | `"surfaces"` | Initial active tab |

### Tabs

| Tab | Description |
|-----|-------------|
| **Surfaces** | Inspect active surfaces, their nodes, and data models |
| **Commands** | View the command log with trust verdicts |
| **Events** | Live stream of runtime events |
| **Trust** | View the current trust policy and blocked commands |

### Hooks

| Hook | Description |
|------|-------------|
| `useCommandLog(runtime)` | Returns command log entries with trust verdicts |
| `useEvents(runtime)` | Returns live event stream entries |

### Types

| Type | Description |
|------|-------------|
| `DevToolsTab` | `"surfaces" \| "commands" \| "events" \| "trust"` |
| `DevToolsPanelProps` | `{ defaultTab?: DevToolsTab }` |
| `CommandLogDisplayEntry` | `{ command, verdict, timestamp }` |
| `EventLogEntry` | `{ type, payload, timestamp }` |

## Usage

Place the panel inside a `RuntimeProvider`:

```tsx
import { RuntimeProvider } from "@uiprotocol/react";
import { DevToolsPanel } from "@uiprotocol/devtools";

function App() {
  return (
    <RuntimeProvider componentsMap={componentsMap}>
      <MyApp />
      {process.env.NODE_ENV === "development" && (
        <DevToolsPanel />
      )}
    </RuntimeProvider>
  );
}
```

## License

[MIT](./LICENSE)
