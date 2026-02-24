import type { AdapterProps, ComponentsMap } from "@uiprotocol/react";

function Container({ node, resolve, renderedChildren }: AdapterProps) {
  const direction = resolve<string>(node.props.direction) ?? "column";
  const gap = resolve<string>(node.props.gap) ?? "8px";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: direction as "row" | "column",
        gap,
      }}
    >
      {renderedChildren}
    </div>
  );
}

function Text({ node, resolve }: AdapterProps) {
  const content = resolve<string>(node.props.content) ?? "";
  const variant = resolve<string>(node.props.variant) ?? "body";

  const style: React.CSSProperties =
    variant === "heading"
      ? { fontSize: "1.5rem", fontWeight: 700, margin: 0 }
      : variant === "caption"
        ? { fontSize: "0.85rem", color: "#888" }
        : {};

  return <p style={{ margin: 0, ...style }}>{String(content)}</p>;
}

function Input({ node, resolve, setData }: AdapterProps) {
  const placeholder = resolve<string>(node.props.placeholder) ?? "";
  const bind = resolve<string>(node.props.bind);
  const value = bind ? (resolve<string>({ path: bind }) ?? "") : "";

  return (
    <input
      type="text"
      placeholder={placeholder}
      value={String(value)}
      onChange={(e) => {
        if (bind) setData(bind, e.target.value);
      }}
      style={{
        flex: 1,
        padding: "8px 12px",
        border: "1px solid #ccc",
        borderRadius: "6px",
        fontSize: "1rem",
      }}
    />
  );
}

function Button({ node, resolve, dispatchAction }: AdapterProps) {
  const label = resolve<string>(node.props.label) ?? "Button";
  const action = node.props.action as
    | { event: string; context?: Record<string, unknown> }
    | undefined;

  return (
    <button
      onClick={() => {
        if (action) dispatchAction(action);
      }}
      style={{
        padding: "8px 16px",
        background: "#4f46e5",
        color: "#fff",
        border: "none",
        borderRadius: "6px",
        fontSize: "1rem",
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

export const componentsMap: ComponentsMap = {
  Container,
  Text,
  Input,
  Button,
};
