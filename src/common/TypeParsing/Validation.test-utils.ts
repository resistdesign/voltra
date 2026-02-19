import { validateTypeInfoValue } from "./Validation";

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
          },
        },
      },
    },
    true,
    null,
    "CREATE",
    null,
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
