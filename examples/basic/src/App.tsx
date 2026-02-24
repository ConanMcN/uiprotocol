import { useState } from "react";
import {
  RuntimeProvider,
  SurfaceRenderer,
  useMessages,
} from "@uiprotocol/react";
import { A2UIAdapter } from "@uiprotocol/a2ui";
import { DevToolsPanel } from "@uiprotocol/devtools";
import { componentsMap } from "./components";
import { steps } from "./messages";

const adapter = new A2UIAdapter();

function AgentSimulator() {
  const { processMessage, surfaces } = useMessages(adapter);
  const [currentStep, setCurrentStep] = useState(0);

  const handleStep = () => {
    if (currentStep >= steps.length) return;
    const step = steps[currentStep];
    for (const msg of step.messages) {
      processMessage(msg);
    }
    setCurrentStep(currentStep + 1);
  };

  const handleReset = () => {
    if (surfaces.length > 0) {
      processMessage({
        version: "v0.9",
        deleteSurface: { surfaceId: "todo-app" },
      });
    }
    setCurrentStep(0);
  };

  const handlePlayAll = () => {
    let stepIdx = currentStep;
    for (let i = stepIdx; i < steps.length; i++) {
      for (const msg of steps[i].messages) {
        processMessage(msg);
      }
    }
    setCurrentStep(steps.length);
  };

  return (
    <div style={{ display: "flex", gap: "24px", height: "100vh" }}>
      {/* Left: Controls + Rendered UI */}
      <div style={{ flex: 1, padding: "24px", overflow: "auto" }}>
        <h1 style={{ margin: "0 0 4px" }}>UIProtocol</h1>
        <p style={{ margin: "0 0 24px", color: "#666" }}>
          Simulate an AI agent building a todo-list UI step by step.
        </p>

        {/* Step controls */}
        <div
          style={{
            display: "flex",
            gap: "8px",
            alignItems: "center",
            marginBottom: "16px",
          }}
        >
          <button onClick={handleStep} disabled={currentStep >= steps.length} style={btnStyle}>
            {currentStep < steps.length
              ? steps[currentStep].label
              : "Done"}
          </button>
          <button onClick={handlePlayAll} disabled={currentStep >= steps.length} style={btnStyle}>
            Play all
          </button>
          <button onClick={handleReset} style={{ ...btnStyle, background: "#666" }}>
            Reset
          </button>
          <span style={{ color: "#888", fontSize: "0.85rem" }}>
            Step {currentStep}/{steps.length}
          </span>
        </div>

        {/* Progress */}
        <div style={{ display: "flex", gap: "4px", marginBottom: "24px" }}>
          {steps.map((_, i) => (
            <div
              key={i}
              style={{
                width: "100%",
                height: "4px",
                borderRadius: "2px",
                background: i < currentStep ? "#4f46e5" : "#e5e7eb",
                transition: "background 0.2s",
              }}
            />
          ))}
        </div>

        {/* Rendered surface */}
        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            padding: "24px",
            minHeight: "200px",
            background: "#fafafa",
          }}
        >
          {surfaces.length === 0 ? (
            <p style={{ color: "#aaa", textAlign: "center", margin: "48px 0" }}>
              No surfaces yet. Click a step to start.
            </p>
          ) : (
            surfaces.map((s) => (
              <SurfaceRenderer key={s.id} surfaceId={s.id} />
            ))
          )}
        </div>
      </div>

      {/* Right: DevTools */}
      <div
        style={{
          width: "420px",
          borderLeft: "1px solid #e5e7eb",
          overflow: "auto",
        }}
      >
        <DevToolsPanel />
      </div>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  padding: "8px 16px",
  background: "#4f46e5",
  color: "#fff",
  border: "none",
  borderRadius: "6px",
  fontSize: "0.9rem",
  cursor: "pointer",
};

export function App() {
  return (
    <RuntimeProvider
      componentsMap={componentsMap}
      onAction={(payload) => console.log("Action dispatched:", payload)}
      onClientError={(error) => console.error("Client error:", error)}
      onWarning={(warning) => console.warn("Warning:", warning)}
    >
      <AgentSimulator />
    </RuntimeProvider>
  );
}
