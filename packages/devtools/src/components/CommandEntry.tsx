import { useState } from "react";
import type { CommandLogDisplayEntry } from "../types";

const styles = {
  container: {
    borderBottom: "1px solid #2a2a2a",
    padding: "6px 8px",
    fontFamily: "monospace",
    fontSize: "11px"
  } as React.CSSProperties,
  header: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    cursor: "pointer",
    color: "#d4d4d4"
  } as React.CSSProperties,
  type: {
    color: "#58a6ff"
  } as React.CSSProperties,
  surfaceId: {
    color: "#9cdcfe"
  } as React.CSSProperties,
  timestamp: {
    color: "#666",
    fontSize: "10px",
    marginLeft: "auto"
  } as React.CSSProperties,
  rejected: {
    color: "#f44"
  } as React.CSSProperties,
  allowed: {
    color: "#3fb950"
  } as React.CSSProperties,
  payload: {
    paddingTop: "4px",
    paddingLeft: "16px",
    fontSize: "10px",
    color: "#808080",
    whiteSpace: "pre-wrap" as const,
    maxHeight: "200px",
    overflow: "auto"
  } as React.CSSProperties
};

interface CommandEntryProps {
  entry: CommandLogDisplayEntry;
}

export function CommandEntry({ entry }: CommandEntryProps) {
  const [expanded, setExpanded] = useState(false);
  const { command, verdict, timestamp } = entry;

  const surfaceId = "surfaceId" in command ? command.surfaceId : undefined;

  return (
    <div style={styles.container}>
      <div style={styles.header} onClick={() => setExpanded(!expanded)}>
        <span>{expanded ? "▼" : "▶"}</span>
        <span style={styles.type}>{command.type}</span>
        {surfaceId && <span style={styles.surfaceId}>{surfaceId}</span>}
        <span style={verdict.allowed ? styles.allowed : styles.rejected}>
          {verdict.allowed ? "OK" : "BLOCKED"}
        </span>
        <span style={styles.timestamp}>
          {new Date(timestamp).toLocaleTimeString()}
        </span>
      </div>
      {expanded && (
        <div style={styles.payload}>
          {JSON.stringify(command, null, 2)}
          {!verdict.allowed && (
            <div style={{ color: "#f44", paddingTop: "4px" }}>
              Reason: {verdict.allowed === false ? verdict.reason : ""}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
