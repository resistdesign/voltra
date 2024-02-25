import {
  DataContext,
  DataContextField,
  DataContextMap,
  DataContextOperationOptions,
} from "./DataContextService";
import {
  getCleanType,
  getCondensedTypeStructure,
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
  const { type, literal = false, multiple = false } = typeStructure;
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
    namespace,
    type,
    content = [],
  } = getCondensedTypeStructure(typeStructure, typeStructureMap);
  const cleanFullTypeName = getCleanType(type, namespace);
  const cachedDataContext = cache[cleanFullTypeName];

  if (cachedDataContext) {
    return cachedDataContext;
  } else {
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
    const newDataContext: DataContext<any, any> = {
      itemTypeName: cleanFullTypeName,
      resolvedType: type,
      isTypeAlias: cleanFullTypeName in typeStructureMap,
      uniquelyIdentifyingFieldName: uuidFieldName,
      allowedOperations: opsList as DataContextOperationOptions[],
      fields: {},
    };

    for (const field of content) {
      const { name: fieldName } = field;

      newDataContext.fields[fieldName] = typeStructureToDataContextField(field);
    }

    cache[cleanFullTypeName] = newDataContext;

    return newDataContext;
  }
};

/**
 * Create a {@link DataContextMap} from a {@link TypeStructureMap} generated from TypeScript types.
 * */
export const typeStructureMapToDataContextMap = (
  typeStructureMap: TypeStructureMap,
): DataContextMap => {
  const dataContextMap: DataContextMap = {};

  Object.entries(typeStructureMap).forEach(([_key, typeStructure]) => {
    const { namespace, type } = typeStructure;
    const cleanFullTypeName = getCleanType(type, namespace);
    const existingDataContext = dataContextMap[cleanFullTypeName];

    dataContextMap[cleanFullTypeName] = !!existingDataContext
      ? existingDataContext
      : typeStructureToDataContext(
          typeStructure,
          typeStructureMap,
          dataContextMap,
        );
  });

  return dataContextMap;
};
