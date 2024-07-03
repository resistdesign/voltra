import { InputComponent } from "../../Types";
import { useMemo } from "react";
import { NumberInput } from "../Primitives/NumberInput";

let idCounter = 0;

const generateUniqueId = () => {
  const randomString = Math.random().toString(36).slice(2, 11);

  return `NUMBER-DATALIST-${randomString}-${idCounter++}`;
};

export const NumberComboBox: InputComponent<HTMLInputElement> = ({
  value,
  onChange,
  options = [],
}) => {
  const listId = useMemo(generateUniqueId, []);

  return (
    <>
      <NumberInput value={value} onChange={onChange} list={listId} />
      <datalist id={listId}>
        {options.map((option, index) => (
          <option key={`Option:${option}:${index}`} value={option} />
        ))}
      </datalist>
    </>
  );
};
