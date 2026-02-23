import type { TrustConfig } from "@uiprotocol/core";
import type { CommandLogDisplayEntry } from "../types";

const styles = {
  container: {
    padding: "8px"
  } as React.CSSProperties,
  section: {
    paddingBottom: "12px"
  } as React.CSSProperties,
  sectionTitle: {
    fontFamily: "monospace",
    fontSize: "12px",
    color: "#58a6ff",
    paddingBottom: "4px"
  } as React.CSSProperties,
  policy: {
    fontFamily: "monospace",
    fontSize: "11px",
    color: "#d4d4d4",
    backgroundColor: "#1e1e1e",
    padding: "8px",
    borderRadius: "4px",
    whiteSpace: "pre-wrap" as const
  } as React.CSSProperties,
  stat: {
    fontFamily: "monospace",
    fontSize: "11px",
    color: "#d4d4d4",
    padding: "2px 0"
  } as React.CSSProperties,
  allowed: {
    color: "#3fb950"
  } as React.CSSProperties,
  rejected: {
    color: "#f44"
  } as React.CSSProperties
};

interface TrustPolicyViewerProps {
  policy: TrustConfig;
  entries: CommandLogDisplayEntry[];
}

export function TrustPolicyViewer({ policy, entries }: TrustPolicyViewerProps) {
  const allowedCount = entries.filter((e) => e.verdict.allowed).length;
  const rejectedCount = entries.filter((e) => !e.verdict.allowed).length;

  return (
    <div style={styles.container}>
      <div style={styles.section}>
        <div style={styles.sectionTitle}>Current Policy</div>
        <pre style={styles.policy}>{JSON.stringify(policy, null, 2)}</pre>
      </div>
      <div style={styles.section}>
        <div style={styles.sectionTitle}>Verdict History</div>
        <div style={styles.stat}>
          <span style={styles.allowed}>Allowed: {allowedCount}</span>
        </div>
        <div style={styles.stat}>
          <span style={styles.rejected}>Rejected: {rejectedCount}</span>
        </div>
        <div style={styles.stat}>Total: {entries.length}</div>
      </div>
    </div>
  );
}
