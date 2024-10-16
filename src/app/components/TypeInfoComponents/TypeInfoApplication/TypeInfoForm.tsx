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
import {TypeInfo, TypeInfoDataItem, TypeOperation} from "../../../../common/TypeParsing/TypeInfo";
import styled from "styled-components";
import { TypeInfoInput } from "../TypeInfoInput";

const LabelText = styled.span`
  &:has(+ input[type="checkbox"]) {
    display: none;
  }

  :not(input[type="checkbox"]) + & {
    display: none;
  }
`;
// TODO: Do options based grid layout.
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
  typeInfo: TypeInfo;
  customInputTypeMap?: Record<string, InputComponent<any>>;
  value: TypeInfoDataItem;
  operation?: TypeOperation;
  onCancel?: () => void;
  onSubmit: (newValue: TypeInfoDataItem) => void;
  onNavigateToType?: (typeNavigation: TypeNavigation) => void;
};

export const TypeInfoForm: FC<TypeInfoFormProps> = ({
  typeInfoName,
  typeInfo,
  customInputTypeMap = {},
  value,
  operation = TypeOperation.CREATE,
  onCancel,
  onSubmit,
  onNavigateToType,
}) => {
  const { primaryField, fields = {} } = typeInfo;
  const primaryFieldValue = useMemo<any>(
    () =>
      typeof value === "object" && value !== null
        ? value[primaryField as keyof TypeInfoDataItem]
        : undefined,
    [value],
  );
  const [internalValue, setInternalValue] = useState<TypeInfoDataItem>({});
  const onFieldChange = useCallback((nameOrIndex: NameOrIndex, value: any) => {
    setInternalValue((prev) => ({
      ...prev,
      [nameOrIndex]: value,
    }));
  }, []);
  const onSubmitInternal = useCallback(() => {
    onSubmit(internalValue);
  }, [internalValue, onSubmit]);
  const onNavigateToTypeForField = useCallback(
    (nameOrIndex: NameOrIndex) => {
      if (onNavigateToType && typeof primaryFieldValue !== "undefined") {
        onNavigateToType({
          fromTypeName: typeInfoName,
          fromTypePrimaryFieldValue: `${primaryFieldValue}`,
          fromTypeFieldName: `${nameOrIndex}`,
          mode: TypeNavigationMode.LIST,
          operation,
        });
      }
    },
    [onNavigateToType, primaryFieldValue, typeInfoName, operation],
  );

  useEffect(() => {
    setInternalValue(value);
  }, [value]);

  // TODO:
  //  [x] labels
  //  [x] advanced input types, including custom
  //  [x] universal field change handler
  //  [X] navigation to sub-types
  //  [ ] arrays
  //  [ ] validation

  return (
    <BaseForm onSubmit={onSubmitInternal}>
      {Object.keys(fields).map((fieldName) => {
        const field = fields[fieldName];

        return (
          <TypeInfoInput
            key={fieldName}
            typeInfoField={field}
            fieldValue={internalValue[fieldName]}
            nameOrIndex={fieldName}
            onChange={onFieldChange}
            onNavigateToType={onNavigateToTypeForField}
            customInputTypeMap={customInputTypeMap}
          />
        );
      })}
      <FormControls>
        {onCancel ? (
          <FormControlButton type="button" onClick={onCancel}>
            Cancel
          </FormControlButton>
        ) : undefined}
        <FormControlButton type="submit">Submit</FormControlButton>
      </FormControls>
    </BaseForm>
  );
};
