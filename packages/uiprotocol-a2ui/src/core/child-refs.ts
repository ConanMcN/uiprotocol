import type { A2UIComponent } from "./types";

const SINGLE_CHILD_KEYS = [
  "child",
  "contentChild",
  "entryPointChild",
  "headerChild",
  "footerChild",
  "leadingChild",
  "trailingChild"
] as const;

const CHILD_LIST_KEYS = ["children"] as const;

const OBJECT_LIST_KEYS = ["tabItems", "items", "actions", "options"] as const;

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

export function collectChildComponentIds(component: A2UIComponent): string[] {
  const childIds: string[] = [];

  for (const key of SINGLE_CHILD_KEYS) {
    maybePushChild(childIds, component[key]);
  }

  for (const key of CHILD_LIST_KEYS) {
    maybePushChildren(childIds, component[key]);
  }

  for (const key of OBJECT_LIST_KEYS) {
    const entries = component[key];
    if (!Array.isArray(entries)) {
      continue;
    }

    for (const entry of entries) {
      if (!entry || typeof entry !== "object") {
        continue;
      }

      const child = (entry as Record<string, unknown>).child;
      const panelChild = (entry as Record<string, unknown>).panelChild;
      maybePushChild(childIds, child);
      maybePushChild(childIds, panelChild);
    }
  }

  const template = component.template;
  if (template && typeof template === "object") {
    maybePushChild(childIds, (template as Record<string, unknown>).child);
    maybePushChildren(childIds, (template as Record<string, unknown>).children);
  }

  return childIds;
}
