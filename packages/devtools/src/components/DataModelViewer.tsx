const styles = {
  container: {
    padding: "8px",
    backgroundColor: "#1e1e1e",
    borderRadius: "4px",
    fontFamily: "monospace",
    fontSize: "11px",
    color: "#d4d4d4",
    overflow: "auto",
    maxHeight: "300px",
    whiteSpace: "pre-wrap" as const,
    wordBreak: "break-all" as const
  } as React.CSSProperties
};

interface DataModelViewerProps {
  data: unknown;
}

export function DataModelViewer({ data }: DataModelViewerProps) {
  return (
    <pre style={styles.container}>
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}
