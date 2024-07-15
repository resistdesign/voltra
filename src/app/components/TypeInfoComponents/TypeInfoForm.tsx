import {
  FC,
  InputHTMLAttributes,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Form } from "../Form";
import { getInputType } from "./InputTypeMapUtils";
import {
  InputComponent,
  InputOptions,
  NameOrIndex,
  TypeInfoDataItem,
  TypeNavigation,
} from "./Types";
import { TypeInfo, TypeInfoField } from "../../../common/TypeParsing/TypeInfo";
import styled from "styled-components";

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
  flex: 1 0 auto;
  display: flex;
  flex-direction: row;
  justify-content: flex-end;
  align-items: center;
  gap: 1em;
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
        const { type: fieldType, possibleValues = [], array, tags } = field;
        const inputOptions: InputOptions = tags as InputOptions;
        const {
          label = "",
          allowCustomSelection,
          customInputType,
          hidden,
        } = inputOptions;

        if (!hidden) {
          const isSelect = possibleValues.length > 0;
          const InputComponent = getInputType(
            fieldType,
            array,
            isSelect,
            allowCustomSelection,
            customInputType,
            customInputTypeMap,
          );
          const fieldValue = internalValue[fieldName];

          return InputComponent ? (
            <label key={fieldName}>
              <LabelText>{label}&nbsp;</LabelText>
              <InputComponent
                nameOrIndex={fieldName}
                typeInfoField={field}
                value={fieldValue}
                onChange={onFieldChange}
                options={inputOptions}
                onNavigateToType={onNavigateToType}
              />
              <LabelText>&nbsp;{label}</LabelText>
            </label>
          ) : undefined;
        }
      })}
      <FormControls>
        {onCancel ? (
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
        ) : undefined}
        <button type="submit">Submit</button>
      </FormControls>
    </BaseForm>
  );
};
