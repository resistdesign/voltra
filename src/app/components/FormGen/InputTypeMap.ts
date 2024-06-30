import { InputComponent } from "./Types";
import { StringInput } from "./Inputs/Primitives/StringInput";
import { NumberInput } from "./Inputs/Primitives/NumberInput";
import { BooleanInput } from "./Inputs/Primitives/BooleanInput";

// TODO: Input types:
//  [x] string
//  [x] number
//  [x] boolean
//  Primitive options selection:
//  [] option selector
//  [] option selector w/ custom value
//  [] option selector w/search
//  [] option selector w/search w/ custom value
//  ---
//  [] custom (i.e. date picker)
//  Designate primary field for object selection:
//  [] existing object selector
//  [] existing object selector w/ search
//  [] existing object selector w/ advanced search
//  ---
//  [] object forms and sub-forms
//  ---
//  [] array of all of the above

export const INPUT_TYPE_MAP: Record<string, InputComponent<any>> = {
  string: StringInput,
  number: NumberInput,
  boolean: BooleanInput,
};
