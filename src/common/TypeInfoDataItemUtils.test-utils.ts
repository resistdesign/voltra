import { getDefaultValueInfo } from "./TypeInfoDataItemUtils";
import { TypeInfoField } from "./TypeParsing/TypeInfo";

const getTypeInfoDataItemUtilsScenarioFields = () => {
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
    stringField,
    numberField,
    booleanField,
    arrayField,
    rawArrayField,
    noDefaultField,
    referenceField,
  };
};

export const runTypeInfoDataItemUtilsStringDefaultScenario = () =>
  getDefaultValueInfo(getTypeInfoDataItemUtilsScenarioFields().stringField);

export const runTypeInfoDataItemUtilsNumberDefaultScenario = () =>
  getDefaultValueInfo(getTypeInfoDataItemUtilsScenarioFields().numberField);

export const runTypeInfoDataItemUtilsBooleanDefaultScenario = () =>
  getDefaultValueInfo(getTypeInfoDataItemUtilsScenarioFields().booleanField);

export const runTypeInfoDataItemUtilsArrayDefaultScenario = () =>
  getDefaultValueInfo(getTypeInfoDataItemUtilsScenarioFields().arrayField);

export const runTypeInfoDataItemUtilsRawArrayDefaultScenario = () =>
  getDefaultValueInfo(getTypeInfoDataItemUtilsScenarioFields().rawArrayField);

export const runTypeInfoDataItemUtilsNoDefaultScenario = () =>
  getDefaultValueInfo(getTypeInfoDataItemUtilsScenarioFields().noDefaultField);

export const runTypeInfoDataItemUtilsReferenceDefaultScenario = () =>
  getDefaultValueInfo(getTypeInfoDataItemUtilsScenarioFields().referenceField);
