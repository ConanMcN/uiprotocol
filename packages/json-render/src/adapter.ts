import type { Command, ParseResult, ProtocolAdapter, UINode } from "@uiprotocol/core";
import { parseSuccess, parseFailure, diagnostic, DIAGNOSTIC_CODES } from "@uiprotocol/core";
import type { JsonRenderSpec, JsonRenderElement } from "./types";
import { translateProps } from "./prop-translator";
import { visibilityToFunctionCall } from "./visibility";

export class JsonRenderAdapter implements ProtocolAdapter {
  readonly protocol = "json-render";

  parse(raw: unknown): ParseResult<Command[]> {
    if (!raw || typeof raw !== "object") {
      return parseFailure([
        diagnostic(DIAGNOSTIC_CODES.invalidEnvelope, "json-render spec must be an object.")
      ]);
    }

    const spec = raw as JsonRenderSpec;

    if (!spec.root || typeof spec.root !== "object") {
      return parseFailure([
        diagnostic(DIAGNOSTIC_CODES.missingField, "json-render spec requires a root element.")
      ]);
    }

    const surfaceId = spec.surfaceId ?? `jr-${Date.now()}`;
    const timestamp = Date.now();
    const commands: Command[] = [];

    // 1. Create surface
    commands.push({
      type: "surface:create",
      surfaceId,
      timestamp,
      protocol: "json-render"
    });

    // 2. Flatten element tree into UINodes
    const nodes: (Partial<UINode> & Pick<UINode, "id">)[] = [];
    let counter = 0;

    const flatten = (element: JsonRenderElement): string => {
      const id = element.id ?? `node-${counter++}`;
      const { type, children, visible, id: _id, ...rest } = element;

      const props = translateProps(rest);

      // Add visibility as __visible prop
      if (visible) {
        props.__visible = visibilityToFunctionCall(visible);
      }

      const childIds: string[] = [];
      if (children) {
        for (const child of children) {
          childIds.push(flatten(child));
        }
      }

      nodes.push({
        id,
        type,
        children: childIds.length > 0 ? childIds : undefined,
        props
      });

      return id;
    };

    // Root element gets id "root"
    const rootElement = { ...spec.root, id: "root" };
    flatten(rootElement);

    commands.push({
      type: "nodes:upsert",
      surfaceId,
      timestamp,
      nodes
    });

    // 3. Set initial state if provided
    if (spec.state) {
      commands.push({
        type: "data:set",
        surfaceId,
        timestamp,
        path: "/",
        value: spec.state
      });
    }

    return parseSuccess(commands);
  }
}
