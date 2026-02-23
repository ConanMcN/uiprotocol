import { useState, useSyncExternalStore, useMemo } from "react";
import type { Runtime } from "@uiprotocol/core";
import type { DevToolsTab, DevToolsPanelProps } from "./types";
import { useCommandLog } from "./hooks/useCommandLog";
import { useEvents } from "./hooks/useEvents";
import { TabBar } from "./components/TabBar";
import { SurfaceInspector } from "./components/SurfaceInspector";
import { CommandEntry } from "./components/CommandEntry";
import { EventStream } from "./components/EventStream";
import { TrustPolicyViewer } from "./components/TrustPolicyViewer";

const styles = {
  container: {
    backgroundColor: "#1a1a1a",
    color: "#d4d4d4",
    border: "1px solid #333",
    borderRadius: "4px",
    fontFamily: "monospace",
    fontSize: "12px",
    overflow: "hidden"
  } as React.CSSProperties,
  header: {
    padding: "8px 12px",
    backgroundColor: "#252525",
    borderBottom: "1px solid #333",
    display: "flex",
    alignItems: "center",
    gap: "8px"
  } as React.CSSProperties,
  title: {
    fontWeight: "bold" as const,
    color: "#58a6ff",
    fontSize: "13px"
  } as React.CSSProperties,
  content: {
    maxHeight: "500px",
    overflow: "auto"
  } as React.CSSProperties,
  empty: {
    padding: "24px",
    textAlign: "center" as const,
    color: "#666"
  } as React.CSSProperties
};

interface DevToolsPanelFullProps extends DevToolsPanelProps {
  runtime: Runtime;
}

export function DevToolsPanel({
  runtime,
  defaultTab = "surfaces"
}: DevToolsPanelFullProps) {
  const [activeTab, setActiveTab] = useState<DevToolsTab>(defaultTab);

  const revision = useSyncExternalStore(
    runtime.subscribe.bind(runtime),
    () => runtime.getRevision()
  );

  const surfaces = useMemo(
    () => runtime.getSurfaces(),
    [runtime, revision]
  );

  const commandEntries = useCommandLog(runtime);
  const eventEntries = useEvents(runtime);
  const trustPolicy = runtime.getTrustPolicy();

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.title}>UIProtocol DevTools</span>
        <span style={{ color: "#666", fontSize: "10px" }}>
          rev:{revision} | {surfaces.length} surface(s)
        </span>
      </div>
      <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
      <div style={styles.content}>
        {activeTab === "surfaces" && (
          surfaces.length === 0 ? (
            <div style={styles.empty}>No surfaces</div>
          ) : (
            surfaces.map((surface) => (
              <SurfaceInspector key={surface.id} surface={surface} />
            ))
          )
        )}
        {activeTab === "commands" && (
          commandEntries.length === 0 ? (
            <div style={styles.empty}>No commands</div>
          ) : (
            commandEntries.map((entry, i) => (
              <CommandEntry key={i} entry={entry} />
            ))
          )
        )}
        {activeTab === "events" && (
          <EventStream entries={eventEntries} />
        )}
        {activeTab === "trust" && (
          <TrustPolicyViewer policy={trustPolicy} entries={commandEntries} />
        )}
      </div>
    </div>
  );
}
