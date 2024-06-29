import { InputComponent } from "./Types";
import { StringInput } from "./Inputs/Primitives/StringInput";
import { NumberInput } from "./Inputs/Primitives/NumberInput";
import { BooleanInput } from "./Inputs/Primitives/BooleanInput";

// TODO: Input types:
//  string
//  number
//  boolean
//  option selector
//  option selector w/ custom value
//  custom (i.e. date picker)
//  existing object selector
//  existing object selector w/ search
//  sub form/object
//  array of all of the above

export const INPUT_TYPE_MAP: Record<string, InputComponent<any>> = {
  string: StringInput,
  number: NumberInput,
  boolean: BooleanInput,
};
