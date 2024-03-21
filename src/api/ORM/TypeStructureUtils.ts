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
  TypeStructureTagMap,
} from "../../common/TypeParsing";

export const DataContextFieldTagNames = {
  uniquelyIdentifyingFieldName: "uniquelyIdentifyingFieldName",
  allowedOperations: "allowedOperations",
  virtual: "virtual",
};

export const getCleanedTagStringValue = (tagValue: any): string | undefined => {
  const trimmed = typeof tagValue === "string" ? tagValue.trim() : undefined;

  return !!trimmed ? trimmed : undefined;
};

export const typeStructureToDataContextField = (
  typeStructure: TypeStructure,
): DataContextField => {
  const {
    type,
    literal = false,
    multiple = false,
    isUnionType = false,
    unionTypes = [],
  } = typeStructure;
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
    isMultiple: !!multiple,
    valueOptions: isUnionType ? unionTypes : undefined,
    embedded: literal,
  };
};

export const mergeDataContextTagMaps = (
  tagMapA: TypeStructureTagMap,
  tagMapB: TypeStructureTagMap,
): TypeStructureTagMap => {
  const { [DataContextFieldTagNames.allowedOperations]: tagMapAAllowedOps } =
    tagMapA;
  const { [DataContextFieldTagNames.allowedOperations]: tagMapBAllowedOps } =
    tagMapB;

  let mergedTag = {
    ...tagMapA,
    ...tagMapB,
  };

  if (tagMapAAllowedOps && tagMapBAllowedOps) {
    const { value: tagMapAAllowedOpsValue } = tagMapAAllowedOps;
    const { value: tagMapBAllowedOpsValue } = tagMapBAllowedOps;

    if (
      typeof tagMapAAllowedOpsValue === "string" &&
      typeof tagMapBAllowedOpsValue === "string"
    ) {
      const mergedAllowedOps = `${tagMapAAllowedOpsValue},${tagMapBAllowedOpsValue}`;
      mergedTag = {
        ...mergedTag,
        [DataContextFieldTagNames.allowedOperations]: {
          type: "string",
          value: mergedAllowedOps,
        },
      };
    }
  }

  return mergedTag;
};

export const typeStructureToDataContext = (
  typeStructure: TypeStructure,
  typeStructureMap: TypeStructureMap,
  defaultUniquelyIdentifyingFieldName?: string,
  cache: DataContextMap = {},
): DataContext<any, any> => {
  const tsMapCache = {};
  const {
    namespace,
    type,
    isUnionType,
    unionTypes = [],
    content = [],
    contentNames: {
      allowed: allowedContentNames = [],
      disallowed: disallowedContentNames = [],
    } = {},
  } = getCondensedTypeStructure(
    typeStructure,
    typeStructureMap,
    mergeDataContextTagMaps,
    tsMapCache,
  );
  const cleanFullTypeName = getCleanType(type, namespace);
  const cachedDataContext = cache[cleanFullTypeName];
  const hasAllowedContentNames = allowedContentNames.length > 0;
  const hasDisallowedContentNames = disallowedContentNames.length > 0;

  if (cachedDataContext) {
    return cachedDataContext;
  } else {
    const uniquelyIdentifyingFieldName = getCleanedTagStringValue(
      getTagValue(
        DataContextFieldTagNames.uniquelyIdentifyingFieldName,
        typeStructure,
      ),
    );
    const allowedOperations = getCleanedTagStringValue(
      getTagValue(DataContextFieldTagNames.allowedOperations, typeStructure),
    );
    const uuidFieldName =
      typeof uniquelyIdentifyingFieldName === "string"
        ? uniquelyIdentifyingFieldName.trim()
        : defaultUniquelyIdentifyingFieldName;
    const opsList = allowedOperations
      ? allowedOperations.split(",").map((o) => o.trim())
      : undefined;
    const newDataContext: DataContext<any, any> = {
      itemTypeName: cleanFullTypeName,
      resolvedType: type,
      uniquelyIdentifyingFieldName: uuidFieldName,
      allowedOperations: opsList as DataContextOperationOptions[],
      valueOptions: isUnionType ? unionTypes : undefined,
      fields: {},
    };

    for (const field of content) {
      const { name: fieldName } = field;
      // IMPORTANT: Use `contentNames` (Pick/Omit) to limit fields.
      const fieldIsAllowed = hasAllowedContentNames
        ? allowedContentNames.includes(fieldName)
        : hasDisallowedContentNames
          ? !disallowedContentNames.includes(fieldName)
          : true;

      if (fieldIsAllowed) {
        const {
          literal: mappedFieldTypeLiteral = false,
          unionTypes: mappedFieldTypeUnionTypes = [],
        } = getCondensedTypeStructure(
          field,
          typeStructureMap,
          mergeDataContextTagMaps,
          tsMapCache,
        );
        const isUnionType =
          mappedFieldTypeLiteral && mappedFieldTypeUnionTypes.length > 0;

        newDataContext.fields[fieldName] = typeStructureToDataContextField({
          ...field,
          isUnionType,
          unionTypes: isUnionType ? mappedFieldTypeUnionTypes : undefined,
        });
      }
    }

    cache[cleanFullTypeName] = newDataContext;

    return newDataContext;
  }
};

export const DEFAULT_UNIQUELY_IDENTIFYING_FIELD_NAME = "id";

/**
 * Create a {@link DataContextMap} from a {@link TypeStructureMap} generated from TypeScript types.
 * Types tagged as `@virtual` will not be included in the resulting {@link DataContextMap}.
 * */
export const typeStructureMapToDataContextMap = (
  typeStructureMap: TypeStructureMap,
  useDefaultUniquelyIdentifyingFieldName = true,
): DataContextMap => {
  const dataContextMap: DataContextMap = {};

  Object.entries(typeStructureMap).forEach(([_key, typeStructure]) => {
    const { namespace, type } = typeStructure;
    const isVirtual = getTagValue(
      DataContextFieldTagNames.virtual,
      typeStructure,
    );
    const cleanFullTypeName = getCleanType(type, namespace);
    // TODO: Losing pick/omit info here, because `type` is being used as the key.
    // TODO: May need to keep the pick/omit types but mark them as not real databases.
    const existingDataContext = dataContextMap[cleanFullTypeName];

    if (!isVirtual) {
      dataContextMap[cleanFullTypeName] = !!existingDataContext
        ? existingDataContext
        : typeStructureToDataContext(
            typeStructure,
            typeStructureMap,
            useDefaultUniquelyIdentifyingFieldName
              ? DEFAULT_UNIQUELY_IDENTIFYING_FIELD_NAME
              : undefined,
            dataContextMap,
          );
    }
  });

  return dataContextMap;
};
