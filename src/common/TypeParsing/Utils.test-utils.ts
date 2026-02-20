import {
  removeNonexistentFieldsFromDataItem,
  removeNonexistentFieldsFromSelectedFields,
  removeTypeReferenceFieldsFromDataItem,
  removeTypeReferenceFieldsFromSelectedFields,
  removeUnselectedFieldsFromDataItem,
} from "./Utils";
import { TypeInfo } from "./TypeInfo";

const getTypeParsingUtilsScenarioData = () => {
  const typeInfo: TypeInfo = {
    fields: {
      id: {
        type: "string",
        array: false,
        readonly: false,
        optional: false,
      },
      title: {
        type: "string",
        array: false,
        readonly: false,
        optional: false,
      },
      author: {
        type: "string",
        typeReference: "Person",
        array: false,
        readonly: false,
        optional: false,
      },
    },
  };

  const selectedFields = ["author", "id", "missing"] as const;
  const dataItem = {
    id: "book-1",
    title: "Guide",
    author: "person-1",
    missing: "ignored",
  };

  return {
    typeInfo,
    selectedFields,
    dataItem,
  };
};

export const runTypeParsingUtilsCleanedSelectedScenario = () => {
  const { typeInfo, selectedFields } = getTypeParsingUtilsScenarioData();
  return removeNonexistentFieldsFromSelectedFields(typeInfo, [...selectedFields]);
};

export const runTypeParsingUtilsNonReferenceSelectedScenario = () => {
  const { typeInfo, selectedFields } = getTypeParsingUtilsScenarioData();
  return removeTypeReferenceFieldsFromSelectedFields(typeInfo, [...selectedFields]);
};

export const runTypeParsingUtilsCleanedDataItemScenario = () => {
  const { typeInfo, dataItem } = getTypeParsingUtilsScenarioData();
  return removeNonexistentFieldsFromDataItem(typeInfo, dataItem);
};

export const runTypeParsingUtilsNonReferenceDataItemScenario = () => {
  const { typeInfo, dataItem } = getTypeParsingUtilsScenarioData();
  return removeTypeReferenceFieldsFromDataItem(typeInfo, dataItem);
};

export const runTypeParsingUtilsUnselectedScenario = () => {
  const { dataItem } = getTypeParsingUtilsScenarioData();
  return removeUnselectedFieldsFromDataItem(dataItem, ["title"]);
};

export const runTypeParsingUtilsNoSelectedScenario = () => {
  const { dataItem } = getTypeParsingUtilsScenarioData();
  return removeUnselectedFieldsFromDataItem(dataItem);
};
