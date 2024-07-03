import { CustomInputComponentMap, InputComponent } from "./Types";
import { StringInput } from "./Inputs/Primitives/StringInput";
import { NumberInput } from "./Inputs/Primitives/NumberInput";
import { BooleanInput } from "./Inputs/Primitives/BooleanInput";
import { TypeKeyword } from "../../../common/TypeParsing/TypeInfo";
import { StringSelector } from "./Inputs/PrimitiveOptionSelectors/StringSelector";
import { NumberSelector } from "./Inputs/PrimitiveOptionSelectors/NumberSelector";
import { StringComboBox } from "./Inputs/PrimitiveOptionSelectors/StringComboBox";
import { NumberComboBox } from "./Inputs/PrimitiveOptionSelectors/NumberComboBox";

// TODO: Input types:
//  [x] string
//  [] specific string types (e.g. email, phone number, long text, etc.)
//  [x] number
//  [x] boolean
//  Primitive options selection:
//  [x] option selector
//  [x] option selector w/ custom value
//  [x] option selector w/search
//  [x] option selector w/search w/ custom value
//  ---
//  Advanced input types:
//  ---
//  [x] custom (i.e. date picker)
//  [] default/JSON editor
//  Designate primary field for object selection:
//  Object search form???
//  [] existing object selector
//  [] existing object selector multiple
//  [] existing object selector w/ search
//  [] existing object selector w/ advanced search (Advanced object field query)
//  ---
//  [] new object forms and sub-forms
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

export const PRIMITIVE_COMBO_BOX_INPUT_TYPE_MAP: Record<
  Exclude<TypeKeyword, "boolean">,
  InputComponent<HTMLInputElement>
> = {
  string: StringComboBox,
  number: NumberComboBox,
};

export const getCustomInputType = (
  customInputTypeName: string,
  customInputTypeMap: CustomInputComponentMap,
): InputComponent<any> | undefined =>
  // TODO: Return a default JSON editor component.
  customInputTypeMap[customInputTypeName];

export const getInputType = (
  typeName: string,
  customInputTypeMap: CustomInputComponentMap,
): InputComponent<any> | undefined => {
  const custom: boolean = false;

  let inputType: InputComponent<any> | undefined = undefined;

  if (custom) {
    inputType = getCustomInputType(typeName, customInputTypeMap);
  } else {
    inputType = PRIMITIVE_INPUT_TYPE_MAP[typeName as TypeKeyword];
  }

  return inputType;
};
