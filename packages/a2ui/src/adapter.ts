import type {
  Command,
  ParseResult,
  ProtocolAdapter,
  UINode,
} from "@uiprotocol/core";
import { parseMessage, getMessageType } from "./message-parser";
import type { A2UIComponent, A2UIMessage } from "./types";

export class A2UIAdapter implements ProtocolAdapter {
  readonly protocol = "a2ui";

  parse(raw: unknown): ParseResult<Command[]> {
    const parseResult = parseMessage(raw);
    if (!parseResult.ok) {
      return { ok: false, errors: parseResult.errors, warnings: parseResult.warnings };
    }

    const message = parseResult.value;
    const commands = this.messageToCommands(message);
    return { ok: true, value: commands, warnings: parseResult.warnings };
  }

  private messageToCommands(message: A2UIMessage): Command[] {
    const timestamp = Date.now();

    if ("createSurface" in message) {
      return [
        {
          type: "surface:create",
          surfaceId: message.createSurface.surfaceId,
          timestamp,
          protocol: "a2ui",
          catalogId: message.createSurface.catalogId,
          theme: message.createSurface.theme,
        },
      ];
    }

    if ("updateComponents" in message) {
      const nodes = message.updateComponents.components.map((comp) =>
        this.componentToNode(comp)
      );
      return [
        {
          type: "nodes:upsert",
          surfaceId: message.updateComponents.surfaceId,
          timestamp,
          nodes,
        },
      ];
    }

    if ("updateDataModel" in message) {
      const { surfaceId, path, value } = message.updateDataModel;
      const hasValue = Object.prototype.hasOwnProperty.call(
        message.updateDataModel,
        "value"
      );

      if (hasValue) {
        return [
          {
            type: "data:set",
            surfaceId,
            timestamp,
            path: path ?? "/",
            value,
          },
        ];
      }

      return [
        {
          type: "data:remove",
          surfaceId,
          timestamp,
          path: path ?? "/",
        },
      ];
    }

    if ("deleteSurface" in message) {
      return [
        {
          type: "surface:delete",
          surfaceId: message.deleteSurface.surfaceId,
          timestamp,
        },
      ];
    }

    return [];
  }

  private componentToNode(
    comp: Partial<A2UIComponent> & Pick<A2UIComponent, "id">
  ): Partial<UINode> & Pick<UINode, "id"> {
    // Extract structural fields, put everything else into props
    const {
      id,
      component,
      children,
      checks,
      child,
      ...rest
    } = comp as A2UIComponent;

    const props: Record<string, unknown> = { ...rest };
    // Keep child ref keys in props for the a2ui child ref collector to find
    if (child) {
      props.child = child;
    }

    const node: Partial<UINode> & Pick<UINode, "id"> = { id, props };
    if (component) {
      node.type = component;
    }
    if (children) {
      node.children = children;
    }
    if (checks) {
      node.checks = checks;
    }

    return node;
  }
}
