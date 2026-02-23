import type { EventLogEntry } from "../types";

const TYPE_COLORS: Record<string, string> = {
  command: "#3fb950",
  "command:before": "#888",
  "trust:blocked": "#f44",
  error: "#f44",
  warning: "#d29922"
};

const styles = {
  container: {
    maxHeight: "400px",
    overflow: "auto"
  } as React.CSSProperties,
  entry: {
    display: "flex",
    gap: "8px",
    padding: "4px 8px",
    borderBottom: "1px solid #2a2a2a",
    fontFamily: "monospace",
    fontSize: "11px",
    color: "#d4d4d4"
  } as React.CSSProperties,
  timestamp: {
    color: "#666",
    fontSize: "10px",
    flexShrink: 0
  } as React.CSSProperties,
  preview: {
    color: "#808080",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
    maxWidth: "400px"
  } as React.CSSProperties,
  empty: {
    padding: "16px",
    textAlign: "center" as const,
    color: "#666",
    fontFamily: "monospace",
    fontSize: "11px"
  } as React.CSSProperties
};

interface EventStreamProps {
  entries: EventLogEntry[];
}

export function EventStream({ entries }: EventStreamProps) {
  if (entries.length === 0) {
    return <div style={styles.empty}>No events yet</div>;
  }

  return (
    <div style={styles.container}>
      {entries.map((entry, i) => (
        <div key={i} style={styles.entry}>
          <span style={styles.timestamp}>
            {new Date(entry.timestamp).toLocaleTimeString()}
          </span>
          <span style={{ color: TYPE_COLORS[entry.type] ?? "#d4d4d4" }}>
            {entry.type}
          </span>
          <span style={styles.preview}>
            {JSON.stringify(entry.payload).slice(0, 80)}
          </span>
        </div>
      ))}
    </div>
  );
}
