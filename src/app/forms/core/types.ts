/**
 * @packageDocumentation
 *
 * Core, platform-agnostic types for form rendering.
 */

import type {
  LiteralValue,
  TypeInfoDataItem,
  TypeInfoField,
} from "../../../common/TypeParsing/TypeInfo";
import type { ItemRelationshipInfoType } from "../../../common/ItemRelationshipInfoTypes";

/**
 * Supported field kinds for renderer selection.
 */
export type FieldKind =
  | "string"
  | "number"
  | "boolean"
  | "enum_select"
  | "array"
  | "relation_single"
  | "relation_array"
  | "custom_single"
  | "custom_array";

/**
 * Value type for a single form field.
 */
export type FieldValue = TypeInfoDataItem[keyof TypeInfoDataItem];

/**
 * Constraints extracted from TypeInfo field tags.
 */
type FieldConstraints = NonNullable<TypeInfoField["tags"]>["constraints"];

/**
 * Supported relation actions emitted by fields.
 */
export type RelationAction = "open" | "add" | "edit" | "remove";

/**
 * Payload for relation action callbacks.
 */
export type RelationActionPayload = {
  /** Relation action to perform. */
  action: RelationAction;
  /** Field key that initiated the action. */
  fieldKey: string;
  /** Field metadata for the relation. */
  field: TypeInfoField;
  /** Current relation value for the field. */
  value: ItemRelationshipInfoType | ItemRelationshipInfoType[] | undefined;
  /** Whether relation selection should use full paging. */
  fullPaging?: boolean;
  /** Index when acting on an array item. */
  index?: number;
  /** Change handler to update the relation value. */
  onChange: (value: FieldValue) => void;
};

/**
 * Supported actions for custom type handlers.
 */
export type CustomTypeAction = "open" | "add" | "edit" | "remove";

/**
 * Payload for custom type action callbacks.
 */
export type CustomTypeActionPayload = {
  /** Custom type action to perform. */
  action: CustomTypeAction;
  /** Field key that initiated the action. */
  fieldKey: string;
  /** Field metadata for the custom type. */
  field: TypeInfoField;
  /** Custom type identifier. */
  customType: string;
  /** Current value for the custom type. */
  value: FieldValue | undefined;
  /** Index when acting on an array item. */
  index?: number;
  /** Change handler to update the custom value. */
  onChange: (value: FieldValue) => void;
};

/**
 * Context passed to field renderers.
 */
export type FieldRenderContext = {
  /** Type info describing the field to render. */
  field: TypeInfoField;
  /** Key that identifies the field in the form values. */
  fieldKey: string;
  /** Display label for the field. */
  label: string;
  /** True when the field must be provided. */
  required: boolean;
  /** True when the field UI should be disabled. */
  disabled: boolean;
  /** Optional error message to display under the field. */
  error?: string;
  /** Current value for the field. */
  value: FieldValue | undefined;
  /** Change handler for the field value. */
  onChange: (value: FieldValue) => void;
  /** Optional validation and UI constraints. */
  constraints?: FieldConstraints;
  /** Optional format hint for the field. */
  format?: string;
  /** Allowed literal values for the field. */
  possibleValues?: LiteralValue[];
  /** Whether custom entries are allowed for selectable values. */
  allowCustomSelection?: boolean;
  /** Optional custom type identifier. */
  customType?: string;
  /** Optional callback for relation actions. */
  onRelationAction?: (payload: RelationActionPayload) => void;
  /** Optional callback for custom type actions. */
  onCustomTypeAction?: (payload: CustomTypeActionPayload) => void;
};

/**
 * Renderer function for a single field kind.
 */
export type FieldRenderer<RenderOutput = unknown> = (
  context: FieldRenderContext,
) => RenderOutput;

/**
 * Optional primitive component contract for suites.
 */
export type PrimitiveComponent<Props, RenderOutput = unknown> = (
  props: Props,
) => RenderOutput;

/**
 * Primitive components that suites may override.
 */
export type PrimitiveComponents<RenderOutput = unknown> = {
  /** Wrapper for grouped field content. */
  FieldWrapper: PrimitiveComponent<{ children: RenderOutput }, RenderOutput>;
  /** Inline error message renderer. */
  ErrorMessage: PrimitiveComponent<{ children: RenderOutput }, RenderOutput>;
  /** Field label renderer. */
  Label: PrimitiveComponent<{ children: RenderOutput; htmlFor?: string }, RenderOutput>;
  /** Button renderer. */
  Button: PrimitiveComponent<
    {
      children: RenderOutput;
      disabled?: boolean;
      type?: "button" | "submit";
      onClick?: () => void;
      "data-signifier"?: string;
    },
    RenderOutput
  >;
};

/**
 * Suite definition with optional renderers/primitives.
 */
export type ComponentSuite<RenderOutput = unknown> = {
  /** Field renderers keyed by kind. */
  renderers: Partial<Record<FieldKind, FieldRenderer<RenderOutput>>>;
  /** Optional primitive component overrides. */
  primitives?: Partial<PrimitiveComponents<RenderOutput>>;
};

/**
 * Fully resolved suite with required renderers.
 */
export type ResolvedSuite<RenderOutput = unknown> = {
  /** Field renderers keyed by kind. */
  renderers: Record<FieldKind, FieldRenderer<RenderOutput>>;
  /** Optional primitive component overrides. */
  primitives?: Partial<PrimitiveComponents<RenderOutput>>;
};
