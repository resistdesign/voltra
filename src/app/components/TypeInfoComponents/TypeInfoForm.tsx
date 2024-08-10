import {
  FC,
  InputHTMLAttributes,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Form } from "../Form";
import {
  InputComponent,
  NameOrIndex,
  TypeInfoDataItem,
  TypeNavigation,
} from "./Types";
import { TypeInfo, TypeInfoField } from "../../../common/TypeParsing/TypeInfo";
import styled from "styled-components";
import { TypeInfoInput } from "./TypeInfoInput";

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
  typeInfo: TypeInfo;
  customInputTypeMap?: Record<string, InputComponent<any>>;
  value: TypeInfoDataItem;
  onCancel?: () => void;
  onSubmit: (newValue: TypeInfoDataItem) => void;
  onNavigateToType?: (typeNavigation: TypeNavigation) => void;
};

export const TypeInfoForm: FC<TypeInfoFormProps> = ({
  typeInfo,
  customInputTypeMap = {},
  value,
  onCancel,
  onSubmit,
  onNavigateToType,
}) => {
  const fields = useMemo<Record<string, TypeInfoField>>(() => {
    const { fields: typeInfoFields = {} }: Partial<TypeInfo> = typeInfo || {};

    return typeInfoFields;
  }, [typeInfo]);
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
            field={field}
            fieldValue={internalValue[fieldName]}
            nameOrIndex={fieldName}
            onChange={onFieldChange}
            onNavigateToType={onNavigateToType}
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
