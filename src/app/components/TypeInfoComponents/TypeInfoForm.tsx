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

export type TypeInfoFormProps = Omit<
  InputHTMLAttributes<HTMLFormElement>,
  "value" | "onChange"
> & {
  typeInfo: TypeInfo;
  customInputTypeMap?: Record<string, InputComponent<any>>;
  value: TypeInfoDataItem;
  onChange: (newValue: TypeInfoDataItem) => void;
  onNavigateToType?: (typeNavigation: TypeNavigation) => void;
};

export const TypeInfoForm: FC<TypeInfoFormProps> = ({
  typeInfo,
  customInputTypeMap = {},
  value,
  onChange,
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
  const onSubmit = useCallback(() => {
    onChange(internalValue);
  }, [internalValue, onChange]);

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
    <Form onSubmit={onSubmit}>
      {Object.keys(fields).map((fieldName) => {
        const field = fields[fieldName];
        const { type: fieldType, possibleValues = [], array, tags } = field;
        const inputOptions: InputOptions = tags as InputOptions;
        const { allowCustomSelection, customInputType, hidden } = inputOptions;

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
            <InputComponent
              key={fieldName}
              nameOrIndex={fieldName}
              typeInfoField={field}
              value={fieldValue}
              onChange={onFieldChange}
              options={inputOptions}
              onNavigateToType={onNavigateToType}
            />
          ) : undefined;
        }
      })}
      <button type="submit">Submit</button>
    </Form>
  );
};
