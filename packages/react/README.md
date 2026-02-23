# @uiprotocol/react

Protocol-agnostic React bindings for `@uiprotocol/core`.

[![npm](https://img.shields.io/npm/v/@uiprotocol/react)](https://www.npmjs.com/package/@uiprotocol/react)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

Part of the [UIProtocol](https://github.com/ConanMcN/uiprotocol) monorepo.

## Installation

```bash
npm install @uiprotocol/react @uiprotocol/core
```

Requires `react` >= 18 and `react-dom` >= 18 as peer dependencies.

## API

### RuntimeProvider

Wraps your app and creates the runtime instance.

```tsx
import { RuntimeProvider } from "@uiprotocol/react";

<RuntimeProvider
  componentsMap={componentsMap}
  trustPolicy={{ defaultPolicy: "allow" }}
  onAction={(payload) => sendToAgent(payload)}
  onClientError={(error) => console.error(error)}
  onWarning={(diagnostic) => console.warn(diagnostic)}
  onHostEffect={(effect) => handleEffect(effect)}
>
  {children}
</RuntimeProvider>
```

### SurfaceRenderer

Renders a surface by its ID. Recursively walks the node tree and renders each node using the matching component from `componentsMap`.

```tsx
import { SurfaceRenderer } from "@uiprotocol/react";

<SurfaceRenderer surfaceId="surface-1" fallback={<Loading />} />
```

### NodeErrorBoundary

Error boundary that catches render errors in individual nodes without taking down the entire surface.

### Hooks

| Hook | Description |
|------|-------------|
| `useMessages(adapter)` | Returns `{ processMessage, processMessages, surfaces }` — feed agent messages into the runtime |
| `useSurface(surfaceId)` | Returns `{ surface }` — reactive access to a single surface |
| `useDataBinding(path)` | Returns `[value, setValue]` — two-way binding to data model paths |
| `useFormBinding(path, options?)` | Returns `{ value, onChange, error }` — form field binding with validation |
| `useAction()` | Returns `dispatchAction(action, options?)` — dispatch user actions |

### Types

| Type | Description |
|------|-------------|
| `AdapterProps` | Props received by every component in `componentsMap` |
| `ComponentsMap` | `Record<string, ComponentType<AdapterProps>>` |
| `RuntimeProviderProps` | Props for `RuntimeProvider` |

### AdapterProps

Every component in your `componentsMap` receives these props:

```ts
interface AdapterProps {
  node: UINode;
  surface: Surface;
  dataModel: unknown;
  scopePath: string;
  childIds: string[];
  renderedChildren: ReactNode[];
  renderChild: (childId: string, key?: string | number, scopePath?: string) => ReactNode;
  resolve: <T>(value: DynamicValue<T> | T) => T | undefined;
  setData: (path: string, value?: unknown, options?: { omitValue?: boolean }) => void;
  dispatchAction: (action: Action, options?: ActionDispatchOptions) => boolean;
}
```

## Usage

```tsx
import { RuntimeProvider, SurfaceRenderer, useMessages } from "@uiprotocol/react";
import { A2UIAdapter } from "@uiprotocol/a2ui";
import type { AdapterProps } from "@uiprotocol/react";

const componentsMap = {
  Text: ({ node, resolve }: AdapterProps) => (
    <p>{resolve(node.props.content)}</p>
  ),
  Input: ({ node, resolve, setData }: AdapterProps) => (
    <input
      placeholder={resolve(node.props.placeholder)}
      onChange={(e) => setData(node.props.bind as string, e.target.value)}
    />
  ),
};

const adapter = new A2UIAdapter();

function App() {
  return (
    <RuntimeProvider
      componentsMap={componentsMap}
      onAction={(payload) => console.log("Action:", payload)}
    >
      <Chat />
    </RuntimeProvider>
  );
}

function Chat() {
  const { processMessage, surfaces } = useMessages(adapter);

  return (
    <>
      <button onClick={() => processMessage(mockMessage)}>Load UI</button>
      {surfaces.map((s) => (
        <SurfaceRenderer key={s.id} surfaceId={s.id} />
      ))}
    </>
  );
}
```

## License

[MIT](./LICENSE)
