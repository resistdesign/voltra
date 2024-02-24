import {
  DataContextField,
  DataContextMap,
  DataContextOperationOptions,
} from "./DataContextService";
import {
  getCleanType,
  getCleanTypeStructureMap,
  getTagValue,
  TypeStructureMap,
} from "../../common/TypeParsing";

export const getCleanedTagStringValue = (tagValue: any): string | undefined => {
  const trimmed = typeof tagValue === "string" ? tagValue.trim() : undefined;

  return !!trimmed ? trimmed : undefined;
};

/**
 * Create a {@link DataContextMap} from a {@link TypeStructureMap} generated from TypeScript types.
 * */
export const typeStructureMapToDataContextMap = (
  typeStructureMap: TypeStructureMap,
): DataContextMap => {
  // TODO: Detect caching by map key???
  const dataContextMap: DataContextMap = {};
  const cleanTypeStructureMap = getCleanTypeStructureMap(typeStructureMap);

  Object.entries(cleanTypeStructureMap).forEach(([key, typeStructure]) => {
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

    dataContextMap[key] = {
      itemTypeName: key,
      resolvedType: type,
      isTypeAlias: !(cleanFullTypeName === key),
      uniquelyIdentifyingFieldName: uuidFieldName,
      allowedOperations: opsList as DataContextOperationOptions[],
      // TODO: What about combo types? (need to merge in combo type fields)
      fields: content.reduce((acc, subType) => {
        const { name, type, literal = false, multiple = false } = subType;
        const subAO = getCleanedTagStringValue(
          getTagValue("allowedOperations", subType),
        );
        const subOpsList =
          typeof subAO === "string"
            ? subAO.split(",").map((o) => o.trim())
            : undefined;

        if (comboType && !literal) {
          // TODO: Get combo type fields.
          // TODO: Is extending other tables possible?
        } else if (comboType && literal) {
          // TODO: Should this even happen???
          // TODO: Get combo type fields.
        } else {
          // TODO: Just apply the current field as is being done now.
        }

        return {
          ...acc,
          [name]: {
            typeName: type,
            isContext: !literal,
            allowedOperations: subOpsList,
            embedded: literal,
            isMultiple: multiple,
          } as DataContextField,
        };
      }, {}),
    };
  });

  return dataContextMap;
};
