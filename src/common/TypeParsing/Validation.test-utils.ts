import { validateTypeInfoValue } from "./Validation";
import { TypeOperation } from "./TypeInfo";

export const runValidateTypeInfoValueCreateScenario = () =>
  validateTypeInfoValue(
    {
      name: "Violet",
    },
    "Person",
    {
      Person: {
        fields: {
          name: {
            type: "string",
            array: false,
            readonly: false,
            optional: false,
          },
        },
      },
    },
    true,
    undefined,
    TypeOperation.CREATE,
    undefined,
    false,
  );

export const runValidateTypeInfoValueCreateTypeNameScenario = () =>
  runValidateTypeInfoValueCreateScenario().typeName;

export const runValidateTypeInfoValueCreateValidScenario = () =>
  runValidateTypeInfoValueCreateScenario().valid;

export const runValidateTypeInfoValueCreateErrorScenario = () =>
  runValidateTypeInfoValueCreateScenario().error;

export const runValidateTypeInfoValueCreateErrorMapScenario = () =>
  runValidateTypeInfoValueCreateScenario().errorMap;
