import {
  DataContext,
  DataContextField,
  DataContextMap,
  DataContextOperationOptions,
} from "./DataContextService";
import {
  getCleanType,
  getCleanTypeStructure,
  getTagValue,
  TypeStructure,
  TypeStructureMap,
} from "../../common/TypeParsing";

export const getCleanedTagStringValue = (tagValue: any): string | undefined => {
  const trimmed = typeof tagValue === "string" ? tagValue.trim() : undefined;

  return !!trimmed ? trimmed : undefined;
};

export const typeStructureToDataContextField = (
  typeStructure: TypeStructure,
): DataContextField => {
  const { name, type, literal = false, multiple = false } = typeStructure;
  const allowedOperations = getCleanedTagStringValue(
    getTagValue("allowedOperations", typeStructure),
  );
  const opsList =
    typeof allowedOperations === "string"
      ? allowedOperations.split(",").map((o) => o.trim())
      : undefined;

  return {
    typeName: type,
    isContext: !literal,
    allowedOperations: opsList as DataContextOperationOptions[],
    embedded: literal,
    isMultiple: !!multiple,
  };
};

export const typeStructureToDataContext = (
  typeStructure: TypeStructure,
  typeStructureMap: TypeStructureMap,
  cache: DataContextMap = {},
): DataContext<any, any> => {
  const {
    name,
    type,
    content = [],
    comboType = false,
  } = getCleanTypeStructure(typeStructure, typeStructureMap);
  const cleanFullTypeName = getCleanType(type, name);
  const uniquelyIdentifyingFieldName = getCleanedTagStringValue(
    getTagValue("uniquelyIdentifyingFieldName", typeStructure),
  );
  const allowedOperations = getCleanedTagStringValue(
    getTagValue("allowedOperations", typeStructure),
  );
  const uuidFieldName =
    typeof uniquelyIdentifyingFieldName === "string"
      ? uniquelyIdentifyingFieldName.trim()
      : undefined;
  const opsList = allowedOperations
    ? allowedOperations.split(",").map((o) => o.trim())
    : undefined;

  let newDataContext = !!cache[cleanFullTypeName]
    ? cache[cleanFullTypeName]
    : {
        itemTypeName: cleanFullTypeName,
        resolvedType: type,
        isTypeAlias: cleanFullTypeName in typeStructureMap,
        uniquelyIdentifyingFieldName: uuidFieldName,
        allowedOperations: opsList as DataContextOperationOptions[],
        fields: {},
      };

  if (comboType) {
    // `content` is a list of types.
    for (const subType of content) {
      const {
        allowedOperations: subTypeAllowedOperations = [],
        fields: subTypeFields = {},
      } = typeStructureToDataContext(subType, typeStructureMap, cache);
      const {
        allowedOperations: newDataContextAllowedOperations = [],
        fields: newDataContextFields = {},
      } = newDataContext;

      // Merge data contexts.
      newDataContext = {
        ...newDataContext,
        allowedOperations: [
          ...newDataContextAllowedOperations,
          ...subTypeAllowedOperations,
        ],
        fields: {
          ...newDataContextFields,
          ...subTypeFields,
        },
      };
    }
  } else {
    // TODO: `content` is a list of fields.
  }

  return newDataContext;
};

/**
 * Create a {@link DataContextMap} from a {@link TypeStructureMap} generated from TypeScript types.
 * */
export const typeStructureMapToDataContextMap = (
  typeStructureMap: TypeStructureMap,
  cache: DataContextMap = {},
): DataContextMap => {
  // TODO: Detect caching by map key???
  const dataContextMap: DataContextMap = cache;

  Object.entries(typeStructureMap).forEach(([key, typeStructure]) => {
    const { namespace, type, content = [], comboType = false } = typeStructure;
    const cleanFullTypeName = getCleanType(type, namespace);
    const uniquelyIdentifyingFieldName = getCleanedTagStringValue(
      getTagValue("uniquelyIdentifyingFieldName", typeStructure),
    );
    const allowedOperations = getCleanedTagStringValue(
      getTagValue("allowedOperations", typeStructure),
    );
    const uuidFieldName =
      typeof uniquelyIdentifyingFieldName === "string"
        ? uniquelyIdentifyingFieldName.trim()
        : undefined;
    const opsList = allowedOperations
      ? allowedOperations.split(",").map((o) => o.trim())
      : undefined;
    const newDataContext = !!cache[cleanFullTypeName]
      ? cache[cleanFullTypeName]
      : {
          itemTypeName: key,
          resolvedType: type,
          isTypeAlias: !(cleanFullTypeName === key),
          uniquelyIdentifyingFieldName: uuidFieldName,
          allowedOperations: opsList as DataContextOperationOptions[],
          // TODO: What about combo types? (need to merge in combo type fields)
          fields: content.reduce((acc, subType) => {
            const { name, comboType = false } = subType;

            if (comboType) {
              // TODO: Merge in fields.
            } else {
              // Just apply the current field.
              return {
                ...acc,
                [name]: typeStructureToDataContextField(subType),
              };
            }
          }, {}),
        };

    dataContextMap[key] = newDataContext;
    cache[cleanFullTypeName] = newDataContext;
  });

  return dataContextMap;
};
