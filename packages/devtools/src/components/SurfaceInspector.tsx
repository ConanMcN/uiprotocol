import { useState } from "react";
import type { Surface } from "@uiprotocol/core";
import { NodeTree } from "./NodeTree";
import { DataModelViewer } from "./DataModelViewer";

const styles = {
  container: {
    borderBottom: "1px solid #333",
    padding: "8px"
  } as React.CSSProperties,
  header: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    cursor: "pointer",
    fontFamily: "monospace",
    fontSize: "12px",
    color: "#d4d4d4"
  } as React.CSSProperties,
  surfaceId: {
    color: "#58a6ff",
    fontWeight: "bold" as const
  } as React.CSSProperties,
  protocol: {
    color: "#ce9178",
    fontSize: "10px"
  } as React.CSSProperties,
  badge: {
    backgroundColor: "#333",
    borderRadius: "8px",
    padding: "1px 6px",
    fontSize: "10px",
    color: "#aaa"
  } as React.CSSProperties,
  section: {
    paddingTop: "8px"
  } as React.CSSProperties,
  sectionTitle: {
    fontFamily: "monospace",
    fontSize: "11px",
    color: "#888",
    padding: "4px 0"
  } as React.CSSProperties
};

interface SurfaceInspectorProps {
  surface: Surface;
}

export function SurfaceInspector({ surface }: SurfaceInspectorProps) {
  const [expanded, setExpanded] = useState(false);
  const [showData, setShowData] = useState(false);

  return (
    <div style={styles.container}>
      <div style={styles.header} onClick={() => setExpanded(!expanded)}>
        <span>{expanded ? "▼" : "▶"}</span>
        <span style={styles.surfaceId}>{surface.id}</span>
        <span style={styles.protocol}>{surface.protocol}</span>
        <span style={styles.badge}>{surface.nodes.size} nodes</span>
      </div>
      {expanded && (
        <>
          <div style={styles.section}>
            <div style={styles.sectionTitle}>Node Tree</div>
            <NodeTree nodes={surface.nodes} />
          </div>
          <div style={styles.section}>
            <div
              style={{ ...styles.sectionTitle, cursor: "pointer" }}
              onClick={() => setShowData(!showData)}
            >
              {showData ? "▼" : "▶"} Data Model
            </div>
            {showData && <DataModelViewer data={surface.dataModel} />}
          </div>
        </>
      )}
    </div>
  );
}
