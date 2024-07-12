import { InputComponent } from "../../Types";
import { useMemo } from "react";
import { NumberInput } from "../Primitives/NumberInput";

let idCounter = 0;

const generateUniqueId = () => {
  const randomString = Math.random().toString(36).slice(2, 11);

  return `NUMBER-DATALIST-${randomString}-${idCounter++}`;
};

export const NumberComboBox: InputComponent<HTMLInputElement> = ({
  typeInfoField: { possibleValues = [] } = {},
  value,
  onChange,
  typeInfoMap: _typeInfoMap,
  typeInfoField: _typeInfoField,
  customInputTypeMap: _customInputTypeMap,
  typeInfoName: _typeInfoName,
  nameOrIndex: _nameOrIndex,
  onNavigateToType: _onNavigateToType,
}) => {
  const listId = useMemo(generateUniqueId, []);

  return (
    <>
      <NumberInput value={value} onChange={onChange} list={listId} />
      <datalist id={listId}>
        {possibleValues.map((pV, index) => (
          <option key={`Option:${pV}:${index}`} value={`${pV}`} />
        ))}
      </datalist>
    </>
  );
};
