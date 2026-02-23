import type { ChildRefCollector, UINode } from "./types";

export const defaultChildRefCollector: ChildRefCollector = (node: UINode): string[] => {
  return node.children ?? [];
};
