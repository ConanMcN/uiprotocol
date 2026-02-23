import type { ChildRefCollector, UINode } from "@uiprotocol/core";
import type { A2UIComponent } from "./types";

/** Keys that are component metadata, not child references. */
const SKIP_KEYS = new Set(["id", "component", "checks"]);

/** Keys within objects that may reference child component IDs. */
const CHILD_REF_KEYS = [
  "child",
  "panelChild",
  "contentChild",
  "entryPointChild",
  "headerChild",
  "footerChild",
  "leadingChild",
  "trailingChild",
];

function maybePushChild(target: string[], value: unknown): void {
  if (typeof value === "string" && value.length > 0) {
    target.push(value);
  }
}

function maybePushChildren(target: string[], value: unknown): void {
  if (!Array.isArray(value)) {
    return;
  }

  for (const entry of value) {
    maybePushChild(target, entry);
  }
}

function scanObjectForChildRefs(
  target: string[],
  obj: Record<string, unknown>
): void {
  for (const refKey of CHILD_REF_KEYS) {
    maybePushChild(target, obj[refKey]);
  }

  const children = obj.children;
  maybePushChildren(target, children);
}

export function collectChildComponentIds(component: A2UIComponent): string[] {
  const childIds: string[] = [];

  for (const [key, value] of Object.entries(component)) {
    if (SKIP_KEYS.has(key)) {
      continue;
    }

    // Direct string child reference (e.g., child, headerChild, footerChild)
    if (typeof value === "string") {
      if (CHILD_REF_KEYS.includes(key) || key === "child") {
        maybePushChild(childIds, value);
      }
      continue;
    }

    // Direct string array (e.g., children)
    if (Array.isArray(value)) {
      for (const entry of value) {
        if (typeof entry === "string") {
          // Array of child IDs (e.g., children: ["id1", "id2"])
          maybePushChild(childIds, entry);
        } else if (entry && typeof entry === "object") {
          // Array of objects with child refs (e.g., tabItems, options, menuItems)
          scanObjectForChildRefs(childIds, entry as Record<string, unknown>);
        }
      }
      continue;
    }

    // Nested object (e.g., template)
    if (value && typeof value === "object" && !Array.isArray(value)) {
      scanObjectForChildRefs(childIds, value as Record<string, unknown>);
    }
  }

  return childIds;
}

/**
 * A ChildRefCollector that reconstructs an A2UIComponent-like object from a
 * UINode and scans it for child references using the A2UI conventions.
 */
export const a2uiChildRefCollector: ChildRefCollector = (
  node: UINode
): string[] => {
  // Reconstruct an A2UIComponent-like object from UINode for scanning
  const flatComponent: Record<string, unknown> = {
    id: node.id,
    component: node.type,
    ...node.props,
  };
  if (node.children) {
    flatComponent.children = node.children;
  }
  if (node.checks) {
    flatComponent.checks = node.checks;
  }
  return collectChildComponentIds(flatComponent as A2UIComponent);
};
