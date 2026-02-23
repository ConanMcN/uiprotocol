import { useState } from "react";
import type { UINode } from "@uiprotocol/core";

const styles = {
  node: {
    paddingLeft: "16px",
    fontFamily: "monospace",
    fontSize: "11px",
    color: "#d4d4d4"
  } as React.CSSProperties,
  toggle: {
    cursor: "pointer",
    background: "none",
    border: "none",
    color: "#58a6ff",
    fontFamily: "monospace",
    fontSize: "11px",
    padding: "2px 4px"
  } as React.CSSProperties,
  type: {
    color: "#ce9178"
  } as React.CSSProperties,
  id: {
    color: "#9cdcfe"
  } as React.CSSProperties,
  props: {
    paddingLeft: "24px",
    fontSize: "10px",
    color: "#808080",
    whiteSpace: "pre-wrap" as const
  } as React.CSSProperties
};

interface NodeTreeProps {
  nodes: Map<string, UINode>;
  nodeId?: string;
  depth?: number;
}

export function NodeTree({ nodes, nodeId = "root", depth = 0 }: NodeTreeProps) {
  const [expanded, setExpanded] = useState(depth < 2);
  const node = nodes.get(nodeId);

  if (!node) {
    return (
      <div style={{ ...styles.node, color: "#f44" }}>
        Missing: {nodeId}
      </div>
    );
  }

  const children = node.children ?? [];
  const hasChildren = children.length > 0;
  const hasProps = Object.keys(node.props).length > 0;

  return (
    <div style={styles.node}>
      <button style={styles.toggle} onClick={() => setExpanded(!expanded)}>
        {hasChildren || hasProps ? (expanded ? "▼" : "▶") : "·"}{" "}
        <span style={styles.type}>{node.type}</span>{" "}
        <span style={styles.id}>#{node.id}</span>
      </button>
      {expanded && hasProps && (
        <div style={styles.props}>
          {JSON.stringify(node.props, null, 2)}
        </div>
      )}
      {expanded &&
        children.map((childId) => (
          <NodeTree key={childId} nodes={nodes} nodeId={childId} depth={depth + 1} />
        ))}
    </div>
  );
}
