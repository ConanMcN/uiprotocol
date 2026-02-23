export interface JsonRenderSpec {
  surfaceId?: string;
  state?: Record<string, unknown>;
  root: JsonRenderElement;
}

export interface JsonRenderElement {
  type: string;
  id?: string;
  children?: JsonRenderElement[];
  visible?: JsonRenderCondition;
  [key: string]: unknown;
}

export interface JsonRenderCondition {
  $cond: string;
  args?: Record<string, unknown>;
}
