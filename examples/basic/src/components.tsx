import {
  Stack,
  Text,
  Input,
  Button,
  Card,
  Badge,
  Box,
} from "@fragments-sdk/ui";
import type { AdapterProps, ComponentsMap } from "@uiprotocol/react";

function Container({ node, resolve, renderedChildren }: AdapterProps) {
  const direction = resolve<string>(node.props.direction) ?? "column";
  const gap = resolve<string>(node.props.gap) ?? "md";

  // Map pixel values to token values
  const gapMap: Record<string, string> = {
    "4px": "xs",
    "8px": "sm",
    "12px": "md",
    "16px": "md",
    "24px": "lg",
  };
  const gapToken = gapMap[gap] ?? gap;

  return (
    <Stack
      direction={direction as "row" | "column"}
      gap={gapToken as "xs" | "sm" | "md" | "lg" | "xl"}
    >
      {renderedChildren}
    </Stack>
  );
}

function TextComponent({ node, resolve }: AdapterProps) {
  const content = resolve<string>(node.props.content) ?? "";
  const variant = resolve<string>(node.props.variant) ?? "body";

  const variantMap: Record<
    string,
    { as: "h2" | "p" | "small"; size: "lg" | "base" | "sm"; weight: "bold" | "normal" }
  > = {
    heading: { as: "h2", size: "lg", weight: "bold" },
    body: { as: "p", size: "base", weight: "normal" },
    caption: { as: "small", size: "sm", weight: "normal" },
  };

  const v = variantMap[variant] ?? variantMap.body;

  return (
    <Text as={v.as} size={v.size} weight={v.weight} color={variant === "caption" ? "tertiary" : "primary"}>
      {String(content)}
    </Text>
  );
}

function InputComponent({ node, resolve, setData }: AdapterProps) {
  const placeholder = resolve<string>(node.props.placeholder) ?? "";
  const bind = resolve<string>(node.props.bind);
  const value = bind ? (resolve<string>({ path: bind }) ?? "") : "";

  return (
    <Box style={{ flex: 1 }}>
      <Input
        placeholder={placeholder}
        value={String(value)}
        onChange={(val) => {
          if (bind) setData(bind, val);
        }}
      />
    </Box>
  );
}

function ButtonComponent({ node, resolve, dispatchAction }: AdapterProps) {
  const label = resolve<string>(node.props.label) ?? "Button";
  const variant = resolve<string>(node.props.variant) as
    | "primary"
    | "secondary"
    | "ghost"
    | undefined;
  const action = node.props.action as
    | { event: string; context?: Record<string, unknown> }
    | undefined;

  return (
    <Button
      variant={variant ?? "primary"}
      onClick={() => {
        if (action) dispatchAction(action);
      }}
    >
      {label}
    </Button>
  );
}

function CardComponent({ renderedChildren }: AdapterProps) {
  return (
    <Card>
      <Card.Body>{renderedChildren}</Card.Body>
    </Card>
  );
}

function BadgeComponent({ node, resolve }: AdapterProps) {
  const label = resolve<string>(node.props.label) ?? "";
  const variant = resolve<string>(node.props.variant) as
    | "default"
    | "success"
    | "warning"
    | "error"
    | "info"
    | undefined;

  return <Badge variant={variant ?? "default"}>{label}</Badge>;
}

export const componentsMap: ComponentsMap = {
  Container,
  Text: TextComponent,
  Input: InputComponent,
  Button: ButtonComponent,
  Card: CardComponent,
  Badge: BadgeComponent,
};
