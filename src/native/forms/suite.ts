/**
 * @packageDocumentation
 *
 * Default native component suite for form rendering.
 */

import { createElement } from "react";
import type { ReactElement } from "react";
import { Platform, Switch, Text, TextInput, View } from "react-native";
import type {
  LiteralValue,
  TypeInfoField,
} from "../../common/TypeParsing/TypeInfo";
import type {
  ComponentSuite,
  FieldRenderContext,
} from "../../app/forms/core";
import { createFormRenderer } from "../../app/forms/core/createFormRenderer";
import {
  ArrayContainer,
  ArrayItemWrapper,
  Button,
  ErrorMessage,
  FieldWrapper,
} from "./primitives";

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
  const { error, translateValidationErrorCode } = context;

  if (!error) {
    return null;
  }

  const message = translateValidationErrorCode(error);

  if (!message) {
    return null;
  }

  return createElement(ErrorMessage, null, message);
};

const renderRelationSingle = (context: FieldRenderContext) => {
  const { field, fieldKey, label, required, disabled, error, onRelationAction } =
    context;

  return createElement(
    FieldWrapper,
    null,
    createElement(Text, null, `${label} ${required ? "*" : ""}`),
    onRelationAction
      ? createElement(
          Button,
          {
            disabled,
            onPress: () =>
              onRelationAction({
                action: "open",
                fieldKey,
                field,
                value: undefined,
                fullPaging: field.tags?.fullPaging,
                onChange: context.onChange,
              }),
          },
          "Manage",
        )
      : null,
    renderErrorMessage(context),
  );
};

const renderRelationArray = (context: FieldRenderContext) => {
  const { field, fieldKey, label, required, disabled, error, onRelationAction } =
    context;

  return createElement(
    FieldWrapper,
    null,
    createElement(Text, null, `${label} ${required ? "*" : ""}`),
    onRelationAction
      ? createElement(
          Button,
          {
            disabled,
            onPress: () =>
              onRelationAction({
                action: "open",
                fieldKey,
                field,
                value: undefined,
                fullPaging: field.tags?.fullPaging,
                onChange: context.onChange,
              }),
          },
          "Manage",
        )
      : null,
    renderErrorMessage(context),
  );
};

const renderCustomSingle = (context: FieldRenderContext) => {
  const { field, fieldKey, label, required, disabled, error } = context;
  const customType = field.tags?.customType;
  const onCustomTypeAction = context.onCustomTypeAction;

  return createElement(
    FieldWrapper,
    null,
    createElement(Text, null, `${label} ${required ? "*" : ""}`),
    createElement(Text, null, formatCustomValue(context.value)),
    customType && onCustomTypeAction
      ? createElement(
          Button,
          {
            disabled,
            onPress: () =>
              onCustomTypeAction({
                action: "open",
                fieldKey,
                field,
                customType,
                value: context.value,
                onChange: context.onChange,
              }),
          },
          "Manage",
        )
      : null,
    renderErrorMessage(context),
  );
};

const renderCustomArray = (context: FieldRenderContext) => {
  const { field, fieldKey, label, required, disabled, error } = context;
  const customType = field.tags?.customType;
  const onCustomTypeAction = context.onCustomTypeAction;
  const arrayValue = Array.isArray(context.value) ? context.value : [];

  return createElement(
    FieldWrapper,
    null,
    createElement(Text, null, `${label} ${required ? "*" : ""}`),
    createElement(
      View,
      { style: { gap: 8, marginBottom: 8 } },
      arrayValue.length === 0
        ? createElement(Text, null, "No items yet.")
        : arrayValue.map((item, index) =>
            createElement(
              View,
              { key: `${fieldKey}-${index}`, style: { gap: 4 } },
              createElement(Text, null, formatCustomValue(item)),
              createElement(
                View,
                { style: { flexDirection: "row", gap: 8, flexWrap: "wrap" } },
                customType && onCustomTypeAction
                  ? createElement(
                      Button,
                      {
                        disabled,
                        onPress: () =>
                          onCustomTypeAction({
                            action: "edit",
                            fieldKey,
                            field,
                            customType,
                            value: context.value,
                            index,
                            onChange: context.onChange,
                          }),
                      },
                      "Manage",
                    )
                  : null,
                customType && onCustomTypeAction
                  ? createElement(
                      Button,
                      {
                        disabled,
                        onPress: () =>
                          onCustomTypeAction({
                            action: "remove",
                            fieldKey,
                            field,
                            customType,
                            value: context.value,
                            index,
                            onChange: context.onChange,
                          }),
                      },
                      "Remove",
                    )
                  : null,
              ),
            ),
          ),
    ),
    customType && onCustomTypeAction
      ? createElement(
          Button,
          {
            disabled,
            onPress: () =>
              onCustomTypeAction({
                action: "add",
                fieldKey,
                field,
                customType,
                value: context.value,
                onChange: context.onChange,
              }),
          },
          "Add Item",
        )
      : null,
    renderErrorMessage(context),
  );
};

const renderArray = (context: FieldRenderContext<ReactElement>) => {
  const { field, fieldKey, label, required, disabled, error } = context;
  const itemField = createArrayItemField(field);
  const arrayValue = Array.isArray(context.value)
    ? [...(context.value as LiteralValue[])]
    : [];

  return createElement(
    FieldWrapper,
    null,
    createElement(Text, null, `${label} ${required ? "*" : ""}`),
    createElement(
      ArrayContainer,
      null,
      arrayValue.map((item, index) =>
        createElement(
          ArrayItemWrapper,
          { key: index },
          createElement(
            View,
            { style: { flex: 1 } },
            context.renderField({
              field: itemField,
              fieldKey: `${fieldKey}[${index}]`,
              value: item,
              onChange: (newItem) => {
                const newValue = [...arrayValue];
                newValue[index] = newItem as LiteralValue;
                context.onChange(newValue);
              },
              disabled,
            }),
          ),
          createElement(
            Button,
            {
              disabled,
              onPress: () => {
                const newValue = [...arrayValue];
                newValue.splice(index, 1);
                context.onChange(newValue);
              },
            },
            "Remove",
          ),
        ),
      ),
      createElement(
        Button,
        {
          disabled,
          onPress: () => {
            const baseValue = Array.isArray(context.value) ? context.value : [];
            const newValue = [...baseValue];
            const newItem =
              field.type === "number" ? 0 : field.type === "boolean" ? false : "";
            newValue.push(newItem);
            context.onChange(newValue);
          },
        },
        "Add Item",
      ),
    ),
    renderErrorMessage(context),
  );
};

const renderString = (context: FieldRenderContext) => {
  const { label, required, disabled, error } = context;

  return createElement(
    FieldWrapper,
    null,
    createElement(Text, null, `${label} ${required ? "*" : ""}`),
    createElement(TextInput, {
      value: (context.value as string) || "",
      onChangeText: (value: string) => context.onChange(value),
      editable: !disabled,
      placeholder: label,
    }),
    renderErrorMessage(context),
  );
};

const renderNumber = (context: FieldRenderContext) => {
  const { label, required, disabled, error } = context;

  return createElement(
    FieldWrapper,
    null,
    createElement(Text, null, `${label} ${required ? "*" : ""}`),
    createElement(TextInput, {
      value:
        (context.value as number) !== undefined ? String(context.value) : "",
      onChangeText: (value: string) => context.onChange(parseNumberValue(value)),
      editable: !disabled,
      keyboardType: "numeric",
      placeholder: label,
    }),
    renderErrorMessage(context),
  );
};

const renderBoolean = (context: FieldRenderContext) => {
  const { label, disabled, error } = context;

  return createElement(
    FieldWrapper,
    null,
    createElement(
      View,
      { style: { flexDirection: "row", alignItems: "center", gap: 8 } },
      createElement(Switch, {
        value: !!context.value,
        onValueChange: (value: boolean) => context.onChange(value),
        disabled,
      }),
      createElement(Text, null, label),
    ),
    renderErrorMessage(context),
  );
};

const renderEnumSelect = (context: FieldRenderContext) => {
  const { field, label, required, disabled, error } = context;
  const selectableValues = getSelectableValues(context.possibleValues) ?? [];

  return createElement(
    FieldWrapper,
    null,
    createElement(Text, null, `${label} ${required ? "*" : ""}`),
    createElement(
      View,
      { style: { gap: 8 } },
      selectableValues.map((val) =>
        createElement(
          Button,
          {
            key: String(val),
            disabled,
            onPress: () =>
              context.onChange(
                field.type === "number" ? Number(val) : String(val),
              ),
          },
          String(val),
        ),
      ),
    ),
    renderErrorMessage(context),
  );
};

const FormRoot = ({
  children,
  onSubmit,
}: {
  children: ReactElement;
  onSubmit?: () => void;
}) => {
  if (Platform?.OS === "web") {
    return createElement(
      "form",
      {
        onSubmit: (event: any) => {
          event?.preventDefault?.();
          onSubmit?.();
        },
      },
      children,
    );
  }
  return createElement(View, null, children);
};

const SuiteButton = ({
  children,
  disabled,
  onClick,
}: {
  children: ReactElement;
  disabled?: boolean;
  onClick?: () => void;
}) => {
  return createElement(Button, { disabled, onPress: onClick }, children);
};

/**
 * Default native suite for form rendering.
 */
export const nativeSuite: ComponentSuite<ReactElement> = {
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
    Label: ({ children }) => createElement(Text, null, children),
    Button: SuiteButton,
  },
};

/**
 * AutoField renderer backed by the default native suite.
 */
export const nativeAutoField = createFormRenderer({
  fallbackSuite: nativeSuite,
}).AutoField;
