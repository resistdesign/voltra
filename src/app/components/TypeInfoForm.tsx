import { InputComponent } from "./TypeInfoForm/Types";
import { Form } from "./Form";
import { FC, useCallback, useEffect, useMemo, useState } from "react";
import {
  TypeInfo,
  TypeInfoField,
  TypeInfoMap,
} from "../../common/TypeParsing/TypeInfo";
import { getInputType } from "./TypeInfoForm/InputTypeMapUtils";

export type TypeInfoFormProps<TypeInfoMapType extends TypeInfoMap> = {
  typeInfoMap: TypeInfoMapType;
  typeInfoName: keyof TypeInfoMapType;
  customInputTypeMap?: Record<string, InputComponent<any>>;
  value: Record<any, any>;
  onChange: (value: Record<any, any>) => void;
};

export const TypeInfoForm: FC<TypeInfoFormProps<any>> = ({
  typeInfoMap,
  typeInfoName,
  customInputTypeMap = {},
  value,
  onChange,
}) => {
  const typeInfo = useMemo<TypeInfo | undefined>(() => {
    return typeInfoMap[typeInfoName];
  }, [typeInfoMap, typeInfoName]);
  const fields = useMemo<Record<string, TypeInfoField>>(() => {
    const { fields: typeInfoFields = {} }: Partial<TypeInfo> = typeInfo || {};

    return typeInfoFields;
  }, [typeInfo]);
  const [internalValue, setInternalValue] = useState<Record<any, any>>(value);
  const onSubmit = useCallback(() => {
    onChange(internalValue);
  }, [internalValue, onChange]);

  useEffect(() => {
    setInternalValue(value);
  }, [value]);

  return (
    <Form onSubmit={onSubmit}>
      {Object.keys(fields).map((fieldName) => {
        const field = fields[fieldName];
        const {
          type: fieldType,
          // TODO: Get from tags, BUT expose in API somehow.
          // customInputType,
        } = field;
        const InputComponent = getInputType(fieldType, customInputTypeMap);
        const fieldValue = internalValue[fieldName];
        const onFieldChange = useCallback(
          (newValue: any) => {
            setInternalValue({
              ...internalValue,
              [fieldName]: newValue,
            });
          },
          [internalValue, fieldName],
        );

        return InputComponent ? (
          <InputComponent
            key={fieldName}
            value={fieldValue}
            onChange={onFieldChange}
          />
        ) : undefined;
      })}
      <button type="submit">Submit</button>
    </Form>
  );
};
