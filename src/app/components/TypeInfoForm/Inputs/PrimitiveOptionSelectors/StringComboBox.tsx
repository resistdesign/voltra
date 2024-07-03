import { InputComponent } from "../../Types";
import { StringInput } from "../Primitives/StringInput";
import { useMemo } from "react";

let idCounter = 0;

const generateUniqueId = () => {
  const randomString = Math.random().toString(36).slice(2, 11);

  return `DATALIST-${randomString}-${idCounter++}`;
};

export const StringComboBox: InputComponent<HTMLInputElement> = ({
  value,
  onChange,
  options = [],
}) => {
  const listId = useMemo(generateUniqueId, []);

  return (
    <>
      <StringInput value={value} onChange={onChange} list={listId} />
      <datalist id={listId}>
        {options.map((option, index) => (
          <option key={`Option:${option}:${index}`} value={option} />
        ))}
      </datalist>
    </>
  );
};
