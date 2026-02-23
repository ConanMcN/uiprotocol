import type { DevToolsTab } from "../types";

const TABS: { id: DevToolsTab; label: string }[] = [
  { id: "surfaces", label: "Surfaces" },
  { id: "commands", label: "Commands" },
  { id: "events", label: "Events" },
  { id: "trust", label: "Trust" }
];

const styles = {
  container: {
    display: "flex",
    gap: "0",
    borderBottom: "1px solid #333",
    backgroundColor: "#1a1a1a"
  } as React.CSSProperties,
  tab: {
    padding: "8px 16px",
    border: "none",
    background: "transparent",
    color: "#888",
    cursor: "pointer",
    fontSize: "12px",
    fontFamily: "monospace",
    borderBottom: "2px solid transparent"
  } as React.CSSProperties,
  activeTab: {
    color: "#fff",
    borderBottomColor: "#58a6ff"
  } as React.CSSProperties
};

interface TabBarProps {
  activeTab: DevToolsTab;
  onTabChange: (tab: DevToolsTab) => void;
}

export function TabBar({ activeTab, onTabChange }: TabBarProps) {
  return (
    <div style={styles.container}>
      {TABS.map((tab) => (
        <button
          key={tab.id}
          style={{
            ...styles.tab,
            ...(activeTab === tab.id ? styles.activeTab : {})
          }}
          onClick={() => onTabChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
