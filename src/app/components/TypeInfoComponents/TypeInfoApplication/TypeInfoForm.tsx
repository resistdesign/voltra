import {
  FC,
  InputHTMLAttributes,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Form } from "../../Form";
import {
  InputComponent,
  NameOrIndex,
  TypeNavigation,
  TypeNavigationMode,
} from "../Types";
import {
  TypeInfo,
  TypeInfoDataItem,
  TypeInfoField,
  TypeOperation,
} from "../../../../common/TypeParsing/TypeInfo";
import styled from "styled-components";
import { TypeInfoInput } from "../TypeInfoInput";
import { getDefaultValueInfo } from "../../../../common/TypeInfoDataItemUtils";

// TODO: Do options/tags based grid layout.
const BaseForm = styled(Form)`
  flex: 1 0 auto;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: stretch;
  gap: 1em;
`;
const FormControls = styled.div`
  flex: 0 0 auto;
  display: flex;
  flex-direction: row;
  justify-content: flex-end;
  align-items: center;
  gap: 1em;
`;
const FormControlButton = styled.button`
  flex: 0 0 auto;

  &[type="submit"] {
    width: unset;
  }
`;

export type TypeInfoFormProps = Omit<
  InputHTMLAttributes<HTMLFormElement>,
  "value" | "onSubmit"
> & {
  typeInfoName: string;
  primaryFieldValue: string;
  typeInfo: TypeInfo;
  customInputTypeMap?: Record<string, InputComponent<any>>;
  value: TypeInfoDataItem | undefined;
  operation?: TypeOperation;
  onCancel?: () => void;
  onSubmit: (newValue: TypeInfoDataItem) => void;
  onNavigateToType?: (typeNavigation: TypeNavigation) => void;
};

export const TypeInfoForm: FC<TypeInfoFormProps> = ({
  typeInfoName,
  primaryFieldValue,
  typeInfo,
  customInputTypeMap = {},
  value,
  operation = TypeOperation.CREATE,
  onCancel,
  onSubmit,
  onNavigateToType,
}) => {
  const { fields } = useMemo<TypeInfo>(
    () => typeInfo ?? { fields: {} },
    [typeInfo],
  );
  const initialValue = useMemo<TypeInfoDataItem>(() => {
    if (typeof value === "object" && value !== null) {
      return value;
    } else {
      const newItem: TypeInfoDataItem = {};

      for (const fld in fields) {
        const tIF: TypeInfoField = fields[fld];

        if (tIF) {
          const { hasDefaultValue, defaultValue } = getDefaultValueInfo(tIF);

          if (hasDefaultValue) {
            newItem[fld] = defaultValue;
          }
        }
      }

      return newItem;
    }
  }, [value, fields]);
  const [internalValue, setInternalValue] =
    useState<TypeInfoDataItem>(initialValue);
  const hasChanged = internalValue !== initialValue;
  const onFieldChange = useCallback(
    (nameOrIndex: NameOrIndex, newFieldValue: any) => {
      setInternalValue((prev) => ({
        ...prev,
        [nameOrIndex]: newFieldValue,
      }));
    },
    [],
  );
  const onSubmitInternal = useCallback(() => {
    onSubmit(internalValue);
  }, [internalValue, onSubmit]);
  const onNavigateToTypeForField = useCallback(
    (nameOrIndex: NameOrIndex) => {
      // TODO: Should never happen on array fields.
      // NOTE: Never open related items on `CREATE` because the item doesn't yet exist to have relationships.
      // TODO: Somthing to work out is what if the related field is required, then what!?
      if (onNavigateToType && operation !== TypeOperation.CREATE) {
        onNavigateToType({
          fromTypeName: typeInfoName,
          fromTypePrimaryFieldValue: primaryFieldValue,
          fromTypeFieldName: `${nameOrIndex}`,
          // TODO: How does `toOperation` work for the various "from" operations?
          toOperation: TypeOperation.UPDATE,
          toMode: TypeNavigationMode.RELATED_ITEMS,
        });
      }
    },
    [onNavigateToType, typeInfoName, primaryFieldValue, operation],
  );

  useEffect(() => {
    if (typeof initialValue === "object") {
      setInternalValue(initialValue);
    }
  }, [initialValue]);

  // TODO:
  //  [x] labels
  //  [x] advanced input types, including custom
  //  [x] universal field change handler
  //  [X] navigation to sub-types
  //  [x] default values
  //  [ ] arrays
  //  [ ] validation

  return (
    <BaseForm onSubmit={onSubmitInternal}>
      {fields
        ? Object.keys(fields).map((fieldName) => {
            const field = fields[fieldName];

            return (
              <TypeInfoInput
                key={fieldName}
                operation={operation}
                typeInfoField={field}
                fieldValue={internalValue[fieldName]}
                nameOrIndex={fieldName}
                onChange={onFieldChange}
                onNavigateToType={onNavigateToTypeForField}
                customInputTypeMap={customInputTypeMap}
              />
            );
          })
        : undefined}
      <FormControls>
        {onCancel ? (
          <FormControlButton
            type="button"
            disabled={!hasChanged}
            onClick={onCancel}
          >
            Cancel
          </FormControlButton>
        ) : undefined}
        <FormControlButton type="submit" disabled={!hasChanged}>
          Submit
        </FormControlButton>
      </FormControls>
    </BaseForm>
  );
};
