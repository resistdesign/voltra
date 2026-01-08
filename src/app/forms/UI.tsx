/**
 * @packageDocumentation
 *
 * Tier 2 UI components: AutoForm, AutoField.
 */

import { FC, FormEvent, useEffect } from "react";
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
import { useFormEngine } from "./Engine";
import {
  ArrayContainer,
  ArrayItemWrapper,
  ErrorMessage,
  FieldWrapper,
} from "./Primitives";
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
export const AutoField: FC<AutoFieldProps> = ({
  field,
  fieldKey,
  value,
  onChange,
  error,
  onRelationAction,
  disabled,
  onCustomTypeAction,
}) => {
  const { tags } = field;
  const label = tags?.label ?? fieldKey;
  const id = `field-${fieldKey}`;
  const isRequired = !field.optional;
  const { possibleValues } = field;
  const allowCustom = tags?.allowCustomSelection;
  const constraints = tags?.constraints;
  const format = tags?.format;
  const customType = tags?.customType;

  const parseNumberValue = (raw: string) => (raw === "" ? null : Number(raw));

  // Filter out boolean and null values for select options
  const selectableValues = possibleValues?.filter(
    (v): v is string | number => typeof v === "string" || typeof v === "number",
  );

  const emitRelationAction = (payload: RelationActionPayload) => {
    if (onRelationAction) {
      onRelationAction(payload);
    }
  };

  const emitCustomTypeAction = (payload: CustomTypeActionPayload) => {
    if (onCustomTypeAction) {
      onCustomTypeAction(payload);
    }
  };

  const formatCustomValue = (val: unknown) => {
    if (val === null || val === undefined) return "None";
    if (typeof val === "string" || typeof val === "number") return String(val);
    return JSON.stringify(val, null, 2);
  };

  if (field.typeReference) {
    if (field.array) {
      return (
        <FieldWrapper>
          <label htmlFor={id}>
            {label} {isRequired && "*"}
          </label>
          {onRelationAction ? (
            <button
              data-signifier="manage-related"
              type="button"
              disabled={disabled}
              onClick={() =>
                emitRelationAction({
                  action: "open",
                  fieldKey,
                  field,
                  value: undefined,
                  fullPaging: tags?.fullPaging,
                  onChange,
                })
              }
            >
              Manage
            </button>
          ) : undefined}
          {error && <ErrorMessage>{error}</ErrorMessage>}
        </FieldWrapper>
      );
    }

    return (
      <FieldWrapper>
        <label htmlFor={id}>
          {label} {isRequired && "*"}
        </label>
        {onRelationAction ? (
          <button
            data-signifier="manage"
            type="button"
            disabled={disabled}
            onClick={() =>
              emitRelationAction({
                action: "open",
                fieldKey,
                field,
                value: undefined,
                fullPaging: tags?.fullPaging,
                onChange,
              })
            }
          >
            Manage
          </button>
        ) : undefined}
        {error && <ErrorMessage>{error}</ErrorMessage>}
      </FieldWrapper>
    );
  }

  if (customType && onCustomTypeAction) {
    if (field.array) {
      const arrayValue = Array.isArray(value) ? value : [];

      return (
        <FieldWrapper>
          <label htmlFor={id}>
            {label} {isRequired && "*"}
          </label>
          <RelationList>
            {arrayValue.length === 0 && (
              <RelationValue>No items yet.</RelationValue>
            )}
            {arrayValue.map((item, index) => (
              <RelationItem key={`${fieldKey}-${index}`}>
                <RelationValue>{formatCustomValue(item)}</RelationValue>
                <RelationActions>
                  <button
                    data-signifier="manage"
                    type="button"
                    disabled={disabled}
                    onClick={() =>
                      emitCustomTypeAction({
                        action: "edit",
                        fieldKey,
                        field,
                        customType,
                        value,
                        index,
                        onChange,
                      })
                    }
                  >
                    Manage
                  </button>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() =>
                      emitCustomTypeAction({
                        action: "remove",
                        fieldKey,
                        field,
                        customType,
                        value,
                        index,
                        onChange,
                      })
                    }
                  >
                    Remove
                  </button>
                </RelationActions>
              </RelationItem>
            ))}
          </RelationList>
          <button
            type="button"
            disabled={disabled}
            onClick={() =>
              emitCustomTypeAction({
                action: "add",
                fieldKey,
                field,
                customType,
                value,
                onChange,
              })
            }
          >
            Add Item
          </button>
          {error && <ErrorMessage>{error}</ErrorMessage>}
        </FieldWrapper>
      );
    }

    return (
      <FieldWrapper>
        <label htmlFor={id}>
          {label} {isRequired && "*"}
        </label>
        <RelationValue>{formatCustomValue(value)}</RelationValue>
        <button
          data-signifier="manage"
          type="button"
          disabled={disabled}
          onClick={() =>
            emitCustomTypeAction({
              action: "open",
              fieldKey,
              field,
              customType,
              value,
              onChange,
            })
          }
        >
          Manage
        </button>
        {error && <ErrorMessage>{error}</ErrorMessage>}
      </FieldWrapper>
    );
  }

  // Handle array fields
  if (field.array) {
    const itemField = createArrayItemField(field);
    const arrayValue = Array.isArray(value)
      ? [...(value as LiteralValue[])]
      : [];

    return (
      <FieldWrapper>
        <label htmlFor={id}>
          {label} {isRequired && "*"}
        </label>
        <ArrayContainer>
          {arrayValue.map((item, index) => (
            <ArrayItemWrapper key={index}>
              <div style={{ flex: 1 }}>
                <AutoField
                  field={itemField}
                  fieldKey={`${fieldKey}[${index}]`}
                  value={item}
                  onChange={(newItem) => {
                    const newValue = [...arrayValue];
                    newValue[index] = newItem as LiteralValue;
                    onChange(newValue);
                  }}
                  disabled={disabled}
                />
              </div>
              <button
                type="button"
                disabled={disabled}
                onClick={() => {
                  const newValue = [...arrayValue];
                  newValue.splice(index, 1);
                  onChange(newValue);
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
              const baseValue = Array.isArray(value) ? value : [];
              const newValue = [...baseValue];
              const newItem =
                field.type === "number"
                  ? 0
                  : field.type === "boolean"
                    ? false
                    : "";
              newValue.push(newItem);
              onChange(newValue);
            }}
          >
            Add Item
          </button>
        </ArrayContainer>
        {error && <ErrorMessage>{error}</ErrorMessage>}
      </FieldWrapper>
    );
  }

  // Handle scalar fields
  return (
    <FieldWrapper>
      {field.type !== "boolean" && (
        <label htmlFor={id}>
          {label} {isRequired && "*"}
        </label>
      )}

      {field.type === "string" && !selectableValues && (
        <input
          id={id}
          type={format || "text"}
          value={(value as string) || ""}
          onChange={(e: any) => onChange(e.target.value)}
          disabled={disabled}
          pattern={constraints?.pattern}
        />
      )}

      {field.type === "number" && !selectableValues && (
        <input
          id={id}
          type="number"
          value={(value as number) ?? ""}
          onChange={(e: any) => onChange(parseNumberValue(e.target.value))}
          disabled={disabled}
          min={constraints?.min}
          max={constraints?.max}
          step={constraints?.step}
        />
      )}

      {field.type === "boolean" && (
        <div>
          <input
            id={id}
            type="checkbox"
            checked={!!value}
            onChange={(e: any) => onChange(e.target.checked)}
            disabled={disabled}
          />
          <label htmlFor={id}> {label} </label>
        </div>
      )}

      {(field.type === "string" || field.type === "number") &&
        selectableValues &&
        allowCustom && (
          <>
            <input
              id={id}
              type="text"
              list={`list-${id}`}
              value={(value as string | number) ?? ""}
              onChange={(e: any) =>
                onChange(
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
            value={(value as string | number) ?? ""}
            onChange={(e: any) =>
              onChange(
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

/**
 * Props for the AutoFormView component.
 */
export interface AutoFormViewProps {
  /** Prepared controller that supplies field state. */
  controller: FormController;
  /** Submit handler invoked with validated form values. */
  onSubmit: (values: FormValues) => void;
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
      <button type="submit">Submit</button>
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
