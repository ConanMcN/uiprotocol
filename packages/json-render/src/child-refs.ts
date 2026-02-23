import type { ChildRefCollector, UINode } from "@uiprotocol/core";

export const jsonRenderChildRefCollector: ChildRefCollector = (node: UINode): string[] => {
  return node.children ?? [];
};
