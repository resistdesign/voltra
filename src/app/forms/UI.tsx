/**
 * @packageDocumentation
 *
 * Tier 2 UI components: AutoForm, AutoField.
 */

import { FC, FormEvent, useEffect } from "react";
import type { ReactElement } from "react";
import type {
  LiteralValue,
  TypeInfo,
  TypeInfoField,
  TypeOperation,
} from "../../common/TypeParsing/TypeInfo";
import type {
  AutoFieldProps,
  CustomTypeActionPayload,
  FormController,
  FormValues,
  RelationActionPayload,
} from "./types";
import type {
  ComponentSuite,
  FieldRenderContext,
} from "./core";
import { useFormEngine } from "./Engine";
import {
  ArrayContainer,
  ArrayItemWrapper,
  ErrorMessage,
  FieldWrapper,
} from "./Primitives";
import { createAutoField, resolveSuite } from "./core";
import styled from "../helpers/styled";

/**
 * Creates a non-array version of a field for use as array item metadata.
 *
 * @param field - Original type info field.
 * @returns A field definition without array metadata.
 */
const createArrayItemField = (field: TypeInfoField): TypeInfoField => ({
  ...field,
  array: false,
  tags: {
    ...field.tags,
    label: undefined,
  },
});

/**
 * Converts a LiteralValue to a string suitable for HTML option value.
 *
 * @param val - Literal value for an option.
 * @returns String value suitable for a select option or undefined.
 */
const toOptionValue = (val: LiteralValue): string | undefined => {
  if (val === null || val === undefined) return undefined;
  if (typeof val === "boolean") return undefined; // booleans not valid for selects
  return String(val);
};

/**
 * Render a form field based on TypeInfo metadata.
 *
 * @param props - AutoField props describing the field and handlers.
 * @returns Rendered field UI.
 */
const parseNumberValue = (raw: string) => (raw === "" ? null : Number(raw));

const getSelectableValues = (possibleValues: LiteralValue[] | undefined) => {
  return possibleValues?.filter(
    (v): v is string | number => typeof v === "string" || typeof v === "number",
  );
};

const formatCustomValue = (val: unknown) => {
  if (val === null || val === undefined) return "None";
  if (typeof val === "string" || typeof val === "number") return String(val);
  return JSON.stringify(val, null, 2);
};

const renderRelationSingle = (context: FieldRenderContext) => {
  const { field, fieldKey, label, required, disabled, error, onRelationAction } =
    context;
  const id = `field-${fieldKey}`;

  return (
    <FieldWrapper>
      <label htmlFor={id}>
        {label} {required && "*"}
      </label>
      {onRelationAction ? (
        <button
          data-signifier="manage"
          type="button"
          disabled={disabled}
          onClick={() =>
            onRelationAction({
              action: "open",
              fieldKey,
              field,
              value: undefined,
              fullPaging: field.tags?.fullPaging,
              onChange: context.onChange,
            })
          }
        >
          Manage
        </button>
      ) : undefined}
      {error && <ErrorMessage>{error}</ErrorMessage>}
    </FieldWrapper>
  );
};

const renderRelationArray = (context: FieldRenderContext) => {
  const { field, fieldKey, label, required, disabled, error, onRelationAction } =
    context;
  const id = `field-${fieldKey}`;

  return (
    <FieldWrapper>
      <label htmlFor={id}>
        {label} {required && "*"}
      </label>
      {onRelationAction ? (
        <button
          data-signifier="manage-related"
          type="button"
          disabled={disabled}
          onClick={() =>
            onRelationAction({
              action: "open",
              fieldKey,
              field,
              value: undefined,
              fullPaging: field.tags?.fullPaging,
              onChange: context.onChange,
            })
          }
        >
          Manage
        </button>
      ) : undefined}
      {error && <ErrorMessage>{error}</ErrorMessage>}
    </FieldWrapper>
  );
};

const renderCustomSingle = (context: FieldRenderContext) => {
  const { field, fieldKey, label, required, disabled, error } = context;
  const id = `field-${fieldKey}`;
  const customType = field.tags?.customType;
  const onCustomTypeAction = context.onCustomTypeAction;

  return (
    <FieldWrapper>
      <label htmlFor={id}>
        {label} {required && "*"}
      </label>
      <RelationValue>{formatCustomValue(context.value)}</RelationValue>
      {customType && onCustomTypeAction ? (
        <button
          data-signifier="manage"
          type="button"
          disabled={disabled}
          onClick={() =>
            onCustomTypeAction({
              action: "open",
              fieldKey,
              field,
              customType,
              value: context.value,
              onChange: context.onChange,
            })
          }
        >
          Manage
        </button>
      ) : undefined}
      {error && <ErrorMessage>{error}</ErrorMessage>}
    </FieldWrapper>
  );
};

const renderCustomArray = (context: FieldRenderContext) => {
  const { field, fieldKey, label, required, disabled, error } = context;
  const id = `field-${fieldKey}`;
  const customType = field.tags?.customType;
  const onCustomTypeAction = context.onCustomTypeAction;
  const arrayValue = Array.isArray(context.value) ? context.value : [];

  return (
    <FieldWrapper>
      <label htmlFor={id}>
        {label} {required && "*"}
      </label>
      <RelationList>
        {arrayValue.length === 0 && (
          <RelationValue>No items yet.</RelationValue>
        )}
        {arrayValue.map((item, index) => (
          <RelationItem key={`${fieldKey}-${index}`}>
            <RelationValue>{formatCustomValue(item)}</RelationValue>
            <RelationActions>
              {customType && onCustomTypeAction ? (
                <button
                  data-signifier="manage"
                  type="button"
                  disabled={disabled}
                  onClick={() =>
                    onCustomTypeAction({
                      action: "edit",
                      fieldKey,
                      field,
                      customType,
                      value: context.value,
                      index,
                      onChange: context.onChange,
                    })
                  }
                >
                  Manage
                </button>
              ) : undefined}
              {customType && onCustomTypeAction ? (
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() =>
                    onCustomTypeAction({
                      action: "remove",
                      fieldKey,
                      field,
                      customType,
                      value: context.value,
                      index,
                      onChange: context.onChange,
                    })
                  }
                >
                  Remove
                </button>
              ) : undefined}
            </RelationActions>
          </RelationItem>
        ))}
      </RelationList>
      {customType && onCustomTypeAction ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() =>
            onCustomTypeAction({
              action: "add",
              fieldKey,
              field,
              customType,
              value: context.value,
              onChange: context.onChange,
            })
          }
        >
          Add Item
        </button>
      ) : undefined}
      {error && <ErrorMessage>{error}</ErrorMessage>}
    </FieldWrapper>
  );
};

let autoFieldRenderer: ReturnType<typeof createAutoField<ReactElement>>;

const renderArray = (context: FieldRenderContext) => {
  const { field, fieldKey, label, required, disabled, error } = context;
  const id = `field-${fieldKey}`;
  const itemField = createArrayItemField(field);
  const arrayValue = Array.isArray(context.value)
    ? [...(context.value as LiteralValue[])]
    : [];

  return (
    <FieldWrapper>
      <label htmlFor={id}>
        {label} {required && "*"}
      </label>
      <ArrayContainer>
        {arrayValue.map((item, index) => (
          <ArrayItemWrapper key={index}>
            <div style={{ flex: 1 }}>
              {autoFieldRenderer({
                field: itemField,
                fieldKey: `${fieldKey}[${index}]`,
                value: item,
                onChange: (newItem) => {
                  const newValue = [...arrayValue];
                  newValue[index] = newItem as LiteralValue;
                  context.onChange(newValue);
                },
                disabled,
              })}
            </div>
            <button
              type="button"
              disabled={disabled}
              onClick={() => {
                const newValue = [...arrayValue];
                newValue.splice(index, 1);
                context.onChange(newValue);
              }}
            >
              Remove
            </button>
          </ArrayItemWrapper>
        ))}
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            const baseValue = Array.isArray(context.value) ? context.value : [];
            const newValue = [...baseValue];
            const newItem =
              field.type === "number" ? 0 : field.type === "boolean" ? false : "";
            newValue.push(newItem);
            context.onChange(newValue);
          }}
        >
          Add Item
        </button>
      </ArrayContainer>
      {error && <ErrorMessage>{error}</ErrorMessage>}
    </FieldWrapper>
  );
};

const renderString = (context: FieldRenderContext) => {
  const { field, fieldKey, label, required, disabled, error } = context;
  const id = `field-${fieldKey}`;

  return (
    <FieldWrapper>
      <label htmlFor={id}>
        {label} {required && "*"}
      </label>
      <input
        id={id}
        type={context.format || "text"}
        value={(context.value as string) || ""}
        onChange={(e: any) => context.onChange(e.target.value)}
        disabled={disabled}
        pattern={context.constraints?.pattern}
      />
      {error && <ErrorMessage>{error}</ErrorMessage>}
    </FieldWrapper>
  );
};

const renderNumber = (context: FieldRenderContext) => {
  const { fieldKey, label, required, disabled, error } = context;
  const id = `field-${fieldKey}`;

  return (
    <FieldWrapper>
      <label htmlFor={id}>
        {label} {required && "*"}
      </label>
      <input
        id={id}
        type="number"
        value={(context.value as number) ?? ""}
        onChange={(e: any) => context.onChange(parseNumberValue(e.target.value))}
        disabled={disabled}
        min={context.constraints?.min}
        max={context.constraints?.max}
        step={context.constraints?.step}
      />
      {error && <ErrorMessage>{error}</ErrorMessage>}
    </FieldWrapper>
  );
};

const renderBoolean = (context: FieldRenderContext) => {
  const { fieldKey, label, disabled, error } = context;
  const id = `field-${fieldKey}`;

  return (
    <FieldWrapper>
      <div>
        <input
          id={id}
          type="checkbox"
          checked={!!context.value}
          onChange={(e: any) => context.onChange(e.target.checked)}
          disabled={disabled}
        />
        <label htmlFor={id}> {label} </label>
      </div>
      {error && <ErrorMessage>{error}</ErrorMessage>}
    </FieldWrapper>
  );
};

const renderEnumSelect = (context: FieldRenderContext) => {
  const { field, fieldKey, label, required, disabled, error } = context;
  const id = `field-${fieldKey}`;
  const selectableValues = getSelectableValues(context.possibleValues);
  const allowCustom = context.allowCustomSelection;

  return (
    <FieldWrapper>
      <label htmlFor={id}>
        {label} {required && "*"}
      </label>
      {(field.type === "string" || field.type === "number") &&
        selectableValues &&
        allowCustom && (
          <>
            <input
              id={id}
              type="text"
              list={`list-${id}`}
              value={(context.value as string | number) ?? ""}
              onChange={(e: any) =>
                context.onChange(
                  field.type === "number"
                    ? parseNumberValue(e.target.value)
                    : e.target.value,
                )
              }
              placeholder="Select or type..."
              disabled={disabled}
            />
            <datalist id={`list-${id}`}>
              {selectableValues.map((val) => (
                <option key={String(val)} value={toOptionValue(val)} />
              ))}
            </datalist>
          </>
        )}
      {(field.type === "string" || field.type === "number") &&
        selectableValues &&
        !allowCustom && (
          <select
            id={id}
            value={(context.value as string | number) ?? ""}
            onChange={(e: any) =>
              context.onChange(
                field.type === "number"
                  ? parseNumberValue(e.target.value)
                  : e.target.value,
              )
            }
            disabled={disabled}
          >
            <option value="">Select...</option>
            {selectableValues.map((val) => (
              <option key={String(val)} value={toOptionValue(val)}>
                {String(val)}
              </option>
            ))}
          </select>
        )}
      {error && <ErrorMessage>{error}</ErrorMessage>}
    </FieldWrapper>
  );
};

const webSuite: ComponentSuite<ReactElement> = {
  renderers: {
    string: renderString,
    number: renderNumber,
    boolean: renderBoolean,
    enum_select: renderEnumSelect,
    array: renderArray,
    relation_single: renderRelationSingle,
    relation_array: renderRelationArray,
    custom_single: renderCustomSingle,
    custom_array: renderCustomArray,
  },
};

const resolvedWebSuite = resolveSuite(undefined, webSuite);
autoFieldRenderer = createAutoField(resolvedWebSuite);

export const AutoField: FC<AutoFieldProps> = (props) => {
  return autoFieldRenderer({
    field: props.field,
    fieldKey: props.fieldKey,
    value: props.value,
    onChange: props.onChange,
    error: props.error,
    disabled: props.disabled,
    onRelationAction: props.onRelationAction,
    onCustomTypeAction: props.onCustomTypeAction,
  });
};

/**
 * Props for the AutoFormView component.
 */
export interface AutoFormViewProps {
  /** Prepared controller that supplies field state. */
  controller: FormController;
  /** Submit handler invoked with validated form values. */
  onSubmit: (values: FormValues) => void;
  /** Disable the submit button when true. */
  submitDisabled?: boolean;
  /** Optional relation action handler for reference fields. */
  onRelationAction?: (payload: RelationActionPayload) => void;
  /** Optional custom type action handler. */
  onCustomTypeAction?: (payload: CustomTypeActionPayload) => void;
}

/**
 * Render a form UI from a prepared form controller.
 *
 * @param props - View props including controller and callbacks.
 * @returns Rendered form view.
 */
export const AutoFormView: FC<AutoFormViewProps> = ({
  controller,
  onSubmit,
  submitDisabled,
  onRelationAction,
  onCustomTypeAction,
}) => {
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (controller.validate()) {
      onSubmit(controller.values);
    }
  };

  return (
    <FormContainer onSubmit={handleSubmit}>
      {controller.fields
        .filter((fieldController) => !fieldController.hidden)
        .map((fieldController) => (
          <AutoField
            key={fieldController.key}
            field={fieldController.field}
            fieldKey={fieldController.key}
            value={fieldController.value}
            onChange={fieldController.onChange}
            error={fieldController.error}
            onRelationAction={onRelationAction}
            disabled={fieldController.disabled}
            onCustomTypeAction={onCustomTypeAction}
          />
        ))}
      <button type="submit" disabled={submitDisabled}>
        Submit
      </button>
    </FormContainer>
  );
};

/**
 * Props for the AutoForm component.
 */
export interface AutoFormProps {
  /** Type metadata used to build the form. */
  typeInfo: TypeInfo;
  /** Submit handler invoked with validated form values. */
  onSubmit: (values: FormValues) => void;
  /** Optional initial values applied before defaults. */
  initialValues?: FormValues;
  /** Optional change handler invoked when values update. */
  onValuesChange?: (values: FormValues) => void;
  /** Optional relation action handler for reference fields. */
  onRelationAction?: (payload: RelationActionPayload) => void;
  /** Optional custom type action handler. */
  onCustomTypeAction?: (payload: CustomTypeActionPayload) => void;
  /** Optional operation override for field state. */
  operation?: TypeOperation;
  /** Disable the submit button when true. */
  submitDisabled?: boolean;
}

/**
 * Build a controller from type metadata and render an auto form.
 *
 * @param props - Auto form props including type info and callbacks.
 * @returns Rendered form bound to a new controller.
 */
export const AutoForm: FC<AutoFormProps> = ({
  typeInfo,
  onSubmit,
  initialValues,
  onValuesChange,
  onRelationAction,
  onCustomTypeAction,
  operation,
  submitDisabled,
}) => {
  const controller = useFormEngine(initialValues, typeInfo, { operation });

  useEffect(() => {
    if (onValuesChange) {
      onValuesChange(controller.values);
    }
  }, [controller.values, onValuesChange]);

  return (
    <AutoFormView
      controller={controller}
      onSubmit={onSubmit}
      onRelationAction={onRelationAction}
      onCustomTypeAction={onCustomTypeAction}
      submitDisabled={submitDisabled}
    />
  );
};

const FormContainer = styled("form")`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  gap: 1em;
`;

/**
 * Wrapper for relation items list.
 */
const RelationList = styled("div")`
  display: flex;
  flex-direction: column;
  gap: 0.5em;
  margin-bottom: 0.5em;
`;

/**
 * Wrapper for a single relation item.
 */
const RelationItem = styled("div")`
  display: flex;
  flex-direction: column;
  gap: 0.5em;
  padding: 0.5em;
`;

/**
 * Display for relation item values.
 */
const RelationValue = styled("pre")`
  margin: 0;
  padding: 0.5em;
  font-size: 0.85em;
  white-space: pre-wrap;
`;

/**
 * Wrapper for relation item actions.
 */
const RelationActions = styled("div")`
  display: flex;
  gap: 0.5em;
  flex-wrap: wrap;
`;
