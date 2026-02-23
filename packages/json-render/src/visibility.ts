import type { FunctionCall } from "@uiprotocol/core";
import type { JsonRenderCondition } from "./types";
import { translateProps } from "./prop-translator";

export function visibilityToFunctionCall(condition: JsonRenderCondition): FunctionCall {
  const fc: FunctionCall = { call: condition.$cond };
  if (condition.args) {
    fc.args = translateProps(condition.args);
  }
  return fc;
}
