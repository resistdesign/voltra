import { getDefaultValueInfo } from "./TypeInfoDataItemUtils";
import { TypeInfoField } from "./TypeParsing/TypeInfo";

export const runTypeInfoDataItemUtilsScenario = () => {
  const stringField: TypeInfoField = {
    type: "string",
    array: false,
    readonly: false,
    optional: false,
    tags: {
      constraints: {
        defaultValue: "hello",
      },
    },
  };

  const numberField: TypeInfoField = {
    type: "number",
    array: false,
    readonly: false,
    optional: false,
    tags: {
      constraints: {
        defaultValue: "42",
      },
    },
  };

  const booleanField: TypeInfoField = {
    type: "boolean",
    array: false,
    readonly: false,
    optional: false,
    tags: {
      constraints: {
        defaultValue: "true",
      },
    },
  };

  const arrayField: TypeInfoField = {
    type: "number",
    array: true,
    readonly: false,
    optional: false,
    tags: {
      constraints: {
        defaultValue: "[1,2,3]",
      },
    },
  };

  const rawArrayField: TypeInfoField = {
    type: "string",
    array: true,
    readonly: false,
    optional: false,
    tags: {
      constraints: {
        defaultValue: "oops",
      },
    },
  };

  const noDefaultField: TypeInfoField = {
    type: "string",
    array: false,
    readonly: false,
    optional: false,
  };

  const referenceField: TypeInfoField = {
    type: "string",
    typeReference: "Author",
    array: false,
    readonly: false,
    optional: false,
    tags: {
      constraints: {
        defaultValue: "person-1",
      },
    },
  };

  return {
    stringDefault: getDefaultValueInfo(stringField),
    numberDefault: getDefaultValueInfo(numberField),
    booleanDefault: getDefaultValueInfo(booleanField),
    arrayDefault: getDefaultValueInfo(arrayField),
    rawArrayDefault: getDefaultValueInfo(rawArrayField),
    noDefault: getDefaultValueInfo(noDefaultField),
    referenceDefault: getDefaultValueInfo(referenceField),
  };
};
