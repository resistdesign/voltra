import { InputComponent } from "../../Types";
import { StringInput } from "../Primitives/StringInput";
import { useMemo } from "react";

let idCounter = 0;

const generateUniqueId = () => {
  const randomString = Math.random().toString(36).slice(2, 11);

  return `DATALIST-${randomString}-${idCounter++}`;
};

export const StringComboBox: InputComponent<HTMLInputElement> = ({
  typeInfoField: { possibleValues = [] } = {},
  value,
  onChange,
  ...rest
}) => {
  const listId = useMemo(generateUniqueId, []);

  return (
    <>
      <StringInput value={value} onChange={onChange} list={listId} {...rest} />
      <datalist id={listId}>
        {possibleValues.map((pV, index) => (
          <option key={`Option:${pV}:${index}`} value={`${pV}`} />
        ))}
      </datalist>
    </>
  );
};
