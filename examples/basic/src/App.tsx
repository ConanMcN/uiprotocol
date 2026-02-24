import { useState, useCallback } from "react";
import {
  RuntimeProvider,
  SurfaceRenderer,
  useMessages,
  useRuntimeContext,
} from "@uiprotocol/react";
import { A2UIAdapter } from "@uiprotocol/a2ui";
import { JsonRenderAdapter } from "@uiprotocol/json-render";
import { DevToolsPanel } from "@uiprotocol/devtools";
import {
  Tabs,
  Button,
  Stack,
  Text,
  Box,
  Badge,
} from "@fragments-sdk/ui";
import "@fragments-sdk/ui/styles";
import { componentsMap } from "./components";
import { a2uiSteps } from "./a2ui-messages";
import { jsonRenderSteps } from "./json-render-messages";
import type { ProtocolAdapter } from "@uiprotocol/core";

const a2uiAdapter = new A2UIAdapter();
const jsonRenderAdapter = new JsonRenderAdapter();

type Protocol = "a2ui" | "json-render";

interface ProtocolConfig {
  adapter: ProtocolAdapter;
  steps: typeof a2uiSteps;
  description: string;
  surfaceId: string;
}

const protocols: Record<Protocol, ProtocolConfig> = {
  "a2ui": {
    adapter: a2uiAdapter,
    steps: a2uiSteps,
    description: "Streaming messages build the UI incrementally — like an agent sending updates over a WebSocket.",
    surfaceId: "todo-app",
  },
  "json-render": {
    adapter: jsonRenderAdapter,
    steps: jsonRenderSteps,
    description: "Declarative specs render the full UI at once — like a single API response.",
    surfaceId: "profile-card",
  },
};

function ProtocolDemo({ protocol }: { protocol: Protocol }) {
  const { runtime } = useRuntimeContext();
  const config = protocols[protocol];
  const { processMessage, surfaces } = useMessages(config.adapter);
  const [currentStep, setCurrentStep] = useState(0);

  const cleanup = useCallback(() => {
    // Delete any existing surfaces for this protocol
    for (const s of runtime.getSurfaces()) {
      runtime.applySingle({
        type: "surface:delete",
        surfaceId: s.id,
        timestamp: Date.now(),
      });
    }
  }, [runtime]);

  const handleStep = () => {
    if (currentStep >= config.steps.length) return;
    const step = config.steps[currentStep];
    for (const msg of step.messages) {
      processMessage(msg);
    }
    setCurrentStep(currentStep + 1);
  };

  const handleReset = () => {
    cleanup();
    setCurrentStep(0);
  };

  const handlePlayAll = () => {
    for (let i = currentStep; i < config.steps.length; i++) {
      for (const msg of config.steps[i].messages) {
        processMessage(msg);
      }
    }
    setCurrentStep(config.steps.length);
  };

  return (
    <Stack direction="column" gap="md">
      <Text as="p" size="sm" color="secondary">
        {config.description}
      </Text>

      {/* Step controls */}
      <Stack direction="row" gap="sm" align="center">
        <Button onClick={handleStep} disabled={currentStep >= config.steps.length} size="sm">
          {currentStep < config.steps.length
            ? config.steps[currentStep].label
            : "Done"}
        </Button>
        <Button onClick={handlePlayAll} disabled={currentStep >= config.steps.length} variant="secondary" size="sm">
          Play all
        </Button>
        <Button onClick={handleReset} variant="ghost" size="sm">
          Reset
        </Button>
        <Badge variant="default">
          Step {currentStep}/{config.steps.length}
        </Badge>
      </Stack>

      {/* Progress bar */}
      <Stack direction="row" gap="xs">
        {config.steps.map((_, i) => (
          <Box
            key={i}
            style={{
              flex: 1,
              height: "4px",
              borderRadius: "2px",
              background: i < currentStep
                ? "var(--fui-color-accent)"
                : "var(--fui-color-border-default)",
              transition: "background 0.2s",
            }}
          />
        ))}
      </Stack>

      {/* Rendered surface */}
      <Box
        border
        rounded="md"
        padding="lg"
        background="secondary"
        style={{ minHeight: "200px" }}
      >
        {surfaces.length === 0 ? (
          <Text as="p" color="tertiary" style={{ textAlign: "center", margin: "48px 0" }}>
            No surfaces yet. Click a step to start.
          </Text>
        ) : (
          surfaces.map((s) => (
            <SurfaceRenderer key={s.id} surfaceId={s.id} />
          ))
        )}
      </Box>

      {/* DevTools */}
      <DevToolsPanel runtime={runtime} />
    </Stack>
  );
}

function AppContent() {
  const { runtime } = useRuntimeContext();
  const [protocol, setProtocol] = useState<Protocol>("a2ui");
  const [resetKey, setResetKey] = useState(0);

  const handleProtocolChange = (val: string) => {
    // Clean up all surfaces when switching protocols
    for (const s of runtime.getSurfaces()) {
      runtime.applySingle({
        type: "surface:delete",
        surfaceId: s.id,
        timestamp: Date.now(),
      });
    }
    setProtocol(val as Protocol);
    setResetKey((k) => k + 1);
  };

  return (
    <Box padding="lg" style={{ maxWidth: "900px", margin: "0 auto" }}>
      <Stack direction="column" gap="lg">
        <Stack direction="column" gap="xs">
          <Text as="h1" size="xl" weight="bold">UIProtocol</Text>
          <Text as="p" color="secondary">
            Protocol-agnostic runtime for agent-generated UIs.
            Switch protocols below — same runtime, same components, different wire formats.
          </Text>
        </Stack>

        <Tabs
          value={protocol}
          onValueChange={handleProtocolChange}
        >
          <Tabs.List>
            <Tabs.Tab value="a2ui">A2UI Protocol</Tabs.Tab>
            <Tabs.Tab value="json-render">json-render Protocol</Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel value="a2ui">
            <Box paddingY="md">
              <ProtocolDemo key={`a2ui-${resetKey}`} protocol="a2ui" />
            </Box>
          </Tabs.Panel>
          <Tabs.Panel value="json-render">
            <Box paddingY="md">
              <ProtocolDemo key={`json-render-${resetKey}`} protocol="json-render" />
            </Box>
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </Box>
  );
}

export function App() {
  return (
    <RuntimeProvider
      componentsMap={componentsMap}
      onAction={(payload) => console.log("Action dispatched:", payload)}
      onClientError={(error) => console.error("Client error:", error)}
      onWarning={(warning) => console.warn("Warning:", warning)}
    >
      <AppContent />
    </RuntimeProvider>
  );
}
