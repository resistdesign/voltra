/**
 * @packageDocumentation
 *
 * Default web component suite for form rendering.
 */

import { createElement } from "react";
import type { FormEvent, ReactElement } from "react";
import type {
  LiteralValue,
  TypeInfoField,
} from "../../common/TypeParsing/TypeInfo";
import { ERROR_MESSAGE_CONSTANTS } from "../../common/TypeParsing/Validation";
import type {
  ComponentSuite,
  FieldRenderContext,
} from "../../app/forms/core";
import { createFormRenderer } from "../../app/forms/core/createFormRenderer";
import {
  ArrayContainer,
  ArrayItemWrapper,
  ErrorMessage,
  FieldWrapper,
} from "./primitives";
import styled from "../../app/helpers/styled";

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

const renderErrorMessage = (context: FieldRenderContext) => {
  const { error, errors = [], translateValidationErrorCode } = context;
  const descriptors = (errors.length ? errors : error ? [error] : []).filter(
    (descriptor) => descriptor.code !== ERROR_MESSAGE_CONSTANTS.NONE,
  );

  if (!descriptors.length) {
    return null;
  }

  return (
    <>
      {descriptors.map((descriptor, index) => {
        const message = translateValidationErrorCode(descriptor);
        if (!message) {
          return null;
        }
        return <ErrorMessage key={`${descriptor.code}-${index}`}>{message}</ErrorMessage>;
      })}
    </>
  );
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
      {renderErrorMessage(context)}
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
      {renderErrorMessage(context)}
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
      {renderErrorMessage(context)}
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
      {renderErrorMessage(context)}
    </FieldWrapper>
  );
};

const renderArray = (context: FieldRenderContext<ReactElement>) => {
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
              {context.renderField({
                field: itemField,
                fieldKey: `${fieldKey}[${index}]`,
                value: item,
                onChange: (newItem) => {
                  const newValue = [...arrayValue];
                  newValue[index] = newItem as LiteralValue;
                  context.onChange(newValue);
                },
                errors: context.arrayItemErrorMap?.[index] ?? [],
                error:
                  context.arrayItemErrorMap?.[index]?.find(
                    (descriptor) => descriptor.code !== ERROR_MESSAGE_CONSTANTS.NONE,
                  ) ?? undefined,
                translateValidationErrorCode:
                  context.translateValidationErrorCode,
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
      {renderErrorMessage(context)}
    </FieldWrapper>
  );
};

const renderString = (context: FieldRenderContext) => {
  const { fieldKey, label, required, disabled, error } = context;
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
      {renderErrorMessage(context)}
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
      {renderErrorMessage(context)}
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
      {renderErrorMessage(context)}
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
      {renderErrorMessage(context)}
    </FieldWrapper>
  );
};

const FormRoot = ({
  children,
  onSubmit,
}: {
  children: ReactElement;
  onSubmit?: () => void;
}) => {
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit?.();
  };

  return <form onSubmit={handleSubmit}>{children}</form>;
};

const SuiteButton = ({
  children,
  disabled,
  type,
  onClick,
  "data-signifier": dataSignifier,
}: {
  children: ReactElement;
  disabled?: boolean;
  type?: "button" | "submit";
  onClick?: () => void;
  "data-signifier"?: string;
}) => {
  return createElement(
    "button",
    {
      type: type ?? "button",
      disabled,
      onClick: type === "submit" ? undefined : onClick,
      "data-signifier": dataSignifier,
    },
    children,
  );
};

/**
 * Default web suite for form rendering.
 */
export const webSuite: ComponentSuite<ReactElement> = {
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
  primitives: {
    FormRoot,
    FieldWrapper,
    ErrorMessage,
    Label: ({ children, htmlFor }) =>
      createElement("label", { htmlFor }, children),
    Button: SuiteButton,
  },
};

/**
 * AutoField renderer backed by the default web suite.
 */
export const webAutoField = createFormRenderer({
  fallbackSuite: webSuite,
}).AutoField;

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
