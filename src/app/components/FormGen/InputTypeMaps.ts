import { InputComponent } from "./Types";
import { StringInput } from "./Inputs/Primitives/StringInput";
import { NumberInput } from "./Inputs/Primitives/NumberInput";
import { BooleanInput } from "./Inputs/Primitives/BooleanInput";
import { TypeKeyword } from "../../../common/TypeParsing/TypeInfo";
import { StringSelector } from "./Inputs/PrimitiveOptionSelectors/StringSelector";
import { NumberSelector } from "./Inputs/PrimitiveOptionSelectors/NumberSelector";

// TODO: Input types:
//  [x] string
//  [x] number
//  [x] boolean
//  Primitive options selection:
//  [x] option selector
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

export const PRIMITIVE_INPUT_TYPE_MAP: Record<
  TypeKeyword,
  InputComponent<HTMLInputElement>
> = {
  string: StringInput,
  number: NumberInput,
  boolean: BooleanInput,
};

export const PRIMITIVE_SELECT_INPUT_TYPE_MAP: Record<
  Exclude<TypeKeyword, "boolean">,
  InputComponent<HTMLSelectElement>
> = {
  string: StringSelector,
  number: NumberSelector,
};
