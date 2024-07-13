import {
  FC,
  InputHTMLAttributes,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Form } from "./Form";
import { getInputType } from "./TypeInfoForm/InputTypeMapUtils";
import {
  InputComponent,
  InputOptions,
  NameOrIndex,
  TypeNavigation,
} from "./TypeInfoForm/Types";
import {
  LiteralValue,
  TypeInfo,
  TypeInfoField,
  TypeInfoMap,
} from "../../common/TypeParsing/TypeInfo";

export type TypeInfoDataItem = Record<string, LiteralValue | LiteralValue[]>;

export type TypeInfoDataMap = Record<any, TypeInfoDataItem>;

export type TypeDataStateMap = {
  create: TypeInfoDataMap;
  update: TypeInfoDataMap;
  delete: TypeInfoDataMap;
};

export type TypeInfoDataStructure = Record<string, TypeDataStateMap>;

export type TypeInfoFormProps = InputHTMLAttributes<HTMLFormElement> & {
  typeInfoName: string;
  typeInfoMap: TypeInfoMap;
  customInputTypeMap?: Record<string, InputComponent<any>>;
  // TODO: Might need to move the structure logic up to a new component.
  value: TypeInfoDataStructure;
  onChange: (typeInfoDataStructure: TypeInfoDataStructure) => void;
};

export const TypeInfoForm: FC<TypeInfoFormProps> = ({
  typeInfoName,
  typeInfoMap,
  customInputTypeMap = {},
  value,
  onChange,
}) => {
  const typeInfo = useMemo<TypeInfo | undefined>(
    () => typeInfoMap[typeInfoName],
    [typeInfoMap, typeInfoName],
  );
  const fields = useMemo<Record<string, TypeInfoField>>(() => {
    const { fields: typeInfoFields = {} }: Partial<TypeInfo> = typeInfo || {};

    return typeInfoFields;
  }, [typeInfo]);
  const [currentDataItem, setCurrentDataItem] = useState<Record<any, any>>({});
  const onFieldChange = useCallback((nameOrIndex: NameOrIndex, value: any) => {
    setCurrentDataItem((prev) => ({
      ...prev,
      [nameOrIndex]: value,
    }));
  }, []);
  const onNavigateToType = useCallback(
    ({ typeName, fieldName }: TypeNavigation) => {
      // TODO: Implement navigation.
      console.log("Navigate to type", typeName, fieldName);
    },
    [],
  );
  const onSubmit = useCallback(() => {
    // TODO: Make this type navigation dependent.
    // onChange(nameOrIndex, currentDataItem);
  }, [value, currentDataItem, onChange]);

  useEffect(() => {
    setCurrentDataItem(value);
  }, [value]);

  // TODO:
  //  [x] labels
  //  [x] advanced input types, including custom
  //  [x] universal field change handler
  //  [ ] navigation to sub-types
  //  [ ] arrays
  //  [ ] validation

  return (
    <Form onSubmit={onSubmit}>
      {Object.keys(fields).map((fieldName) => {
        const field = fields[fieldName];
        const { type: fieldType, possibleValues = [], array, tags } = field;
        const isSelect = possibleValues.length > 0;
        const inputOptions: InputOptions = tags as InputOptions;
        const { allowCustomSelection, customInputType } = inputOptions;
        const InputComponent = getInputType(
          fieldType,
          array,
          isSelect,
          allowCustomSelection,
          customInputType,
          customInputTypeMap,
        );
        const fieldValue = currentDataItem[fieldName];

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
      })}
      <button type="submit">Submit</button>
    </Form>
  );
};
