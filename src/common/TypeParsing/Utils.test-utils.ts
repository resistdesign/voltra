import {
  removeNonexistentFieldsFromDataItem,
  removeNonexistentFieldsFromSelectedFields,
  removeTypeReferenceFieldsFromDataItem,
  removeTypeReferenceFieldsFromSelectedFields,
  removeUnselectedFieldsFromDataItem,
} from "./Utils";
import { TypeInfo } from "./TypeInfo";

export const runTypeParsingUtilsScenario = () => {
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

  const selectedFields = ["id", "author", "missing"] as const;
  const cleanedSelected = removeNonexistentFieldsFromSelectedFields(
    typeInfo,
    [...selectedFields],
  );
  const nonReferenceSelected = removeTypeReferenceFieldsFromSelectedFields(
    typeInfo,
    [...selectedFields],
  );

  const dataItem = {
    id: "book-1",
    title: "Guide",
    author: "person-1",
    missing: "ignored",
  };
  const cleanedDataItem = removeNonexistentFieldsFromDataItem(
    typeInfo,
    dataItem,
  );
  const nonReferenceDataItem = removeTypeReferenceFieldsFromDataItem(
    typeInfo,
    dataItem,
  );
  const unselected = removeUnselectedFieldsFromDataItem(dataItem, ["title"]);
  const noSelected = removeUnselectedFieldsFromDataItem(dataItem);

  return {
    cleanedSelected,
    nonReferenceSelected,
    cleanedDataItem,
    nonReferenceDataItem,
    unselected,
    noSelected,
  };
};
