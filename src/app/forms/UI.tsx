/**
 * @packageDocumentation
 *
 * Tier 2 UI components: AutoForm, AutoField.
 */

import React, { FC, FormEvent } from "react";
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
  Button,
  CheckboxWrapper,
  ErrorMessage,
  FieldWrapper,
  Input,
  Label,
  Select,
} from "./Primitives";
import styled from "../helpers/styled";

// Use function syntax for better ecosystem compatibility
/**
 * Layout wrapper for auto-generated forms.
 */
const FormContainer = styled("form")`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 600px;
  padding: 1rem;
  border: 1px solid #eee;
  border-radius: 8px;
`;

/**
 * Primary submit button styling for auto forms.
 */
const SubmitButton = styled("button")`
  padding: 0.75rem 1.5rem;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;

  &:hover {
    background-color: #0056b3;
  }
`;

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
          <Label htmlFor={id}>
            {label} {isRequired && "*"}
          </Label>
          {onRelationAction ? (
            <Button
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
              Manage Related
            </Button>
          ) : (
            <RelationHint>
              Provide onRelationAction to manage related items.
            </RelationHint>
          )}
          {error && <ErrorMessage>{error}</ErrorMessage>}
        </FieldWrapper>
      );
    }

    return (
      <FieldWrapper>
        <Label htmlFor={id}>
          {label} {isRequired && "*"}
        </Label>
        {onRelationAction ? (
          <Button
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
          </Button>
        ) : (
          <RelationHint>
            Provide onRelationAction to manage related items.
          </RelationHint>
        )}
        {error && <ErrorMessage>{error}</ErrorMessage>}
      </FieldWrapper>
    );
  }

  if (customType && onCustomTypeAction) {
    if (field.array) {
      const arrayValue = Array.isArray(value) ? value : [];

      return (
        <FieldWrapper>
          <Label htmlFor={id}>
            {label} {isRequired && "*"}
          </Label>
          <RelationList>
            {arrayValue.length === 0 && (
              <RelationHint>No items yet.</RelationHint>
            )}
            {arrayValue.map((item, index) => (
              <RelationItem key={`${fieldKey}-${index}`}>
                <RelationValue>{formatCustomValue(item)}</RelationValue>
                <RelationActions>
                  <Button
                    type="button"
                    disabled={disabled}
                    onClick={() =>
                      emitCustomTypeAction({
                        action: "edit",
                        fieldKey,
                        field,
                        customType,
                        value: item,
                        index,
                        onChange,
                      })
                    }
                  >
                    Manage
                  </Button>
                  <Button
                    type="button"
                    disabled={disabled}
                    onClick={() =>
                      emitCustomTypeAction({
                        action: "remove",
                        fieldKey,
                        field,
                        customType,
                        value: item,
                        index,
                        onChange,
                      })
                    }
                  >
                    Remove
                  </Button>
                </RelationActions>
              </RelationItem>
            ))}
          </RelationList>
          <Button
            type="button"
            disabled={disabled}
            onClick={() =>
              emitCustomTypeAction({
                action: "add",
                fieldKey,
                field,
                customType,
                value: arrayValue,
                onChange,
              })
            }
          >
            Add Item
          </Button>
          {error && <ErrorMessage>{error}</ErrorMessage>}
        </FieldWrapper>
      );
    }

    return (
      <FieldWrapper>
        <Label htmlFor={id}>
          {label} {isRequired && "*"}
        </Label>
        <RelationValue>{formatCustomValue(value)}</RelationValue>
        <Button
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
        </Button>
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
        <Label htmlFor={id}>
          {label} {isRequired && "*"}
        </Label>
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
              <Button
                type="button"
                disabled={disabled}
                onClick={() => {
                  const newValue = [...arrayValue];
                  newValue.splice(index, 1);
                  onChange(newValue);
                }}
              >
                Remove
              </Button>
            </ArrayItemWrapper>
          ))}
          <Button
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
          </Button>
        </ArrayContainer>
        {error && <ErrorMessage>{error}</ErrorMessage>}
      </FieldWrapper>
    );
  }

  // Handle scalar fields
  return (
    <FieldWrapper>
      {field.type !== "boolean" && (
        <Label htmlFor={id}>
          {label} {isRequired && "*"}
        </Label>
      )}

      {field.type === "string" && !selectableValues && (
        <Input
          id={id}
          type={format || "text"}
          value={(value as string) || ""}
          onChange={(e: any) => onChange(e.target.value)}
          disabled={disabled}
          pattern={constraints?.pattern}
        />
      )}

      {field.type === "number" && !selectableValues && (
        <Input
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
        <CheckboxWrapper>
          <Input
            id={id}
            type="checkbox"
            checked={!!value}
            onChange={(e: any) => onChange(e.target.checked)}
            disabled={disabled}
          />
          <Label htmlFor={id}> {label} </Label>
        </CheckboxWrapper>
      )}

      {(field.type === "string" || field.type === "number") &&
        selectableValues &&
        allowCustom && (
          <>
            <Input
              id={id}
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
          <Select
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
          </Select>
        )}

      {error && <ErrorMessage>{error}</ErrorMessage>}
    </FieldWrapper>
  );
};

/**
 * Props for the AutoFormView component.
 */
export interface AutoFormViewProps {
  controller: FormController;
  onSubmit: (values: FormValues) => void;
  onRelationAction?: (payload: RelationActionPayload) => void;
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
      <SubmitButton type="submit">Submit</SubmitButton>
    </FormContainer>
  );
};

/**
 * Props for the AutoForm component.
 */
export interface AutoFormProps {
  typeInfo: TypeInfo;
  onSubmit: (values: FormValues) => void;
  initialValues?: FormValues;
  onValuesChange?: (values: FormValues) => void;
  onRelationAction?: (payload: RelationActionPayload) => void;
  onCustomTypeAction?: (payload: CustomTypeActionPayload) => void;
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

  React.useEffect(() => {
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

/**
 * Informational hint for relation fields without handlers.
 */
const RelationHint = styled("div")`
  color: #777;
  font-size: 0.85rem;
`;

/**
 * Wrapper for relation items list.
 */
const RelationList = styled("div")`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
`;

/**
 * Wrapper for a single relation item.
 */
const RelationItem = styled("div")`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.5rem;
  border: 1px dashed #ccc;
  border-radius: 6px;
`;

/**
 * Display for relation item values.
 */
const RelationValue = styled("pre")`
  margin: 0;
  background: #f7f7f7;
  padding: 0.5rem;
  border-radius: 4px;
  font-size: 0.85rem;
  white-space: pre-wrap;
`;

/**
 * Wrapper for relation item actions.
 */
const RelationActions = styled("div")`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
`;
