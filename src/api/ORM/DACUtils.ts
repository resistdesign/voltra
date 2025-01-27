import {
  LiteralValue,
  TypeInfo,
  TypeInfoDataItem,
} from "../../common/TypeParsing/TypeInfo";
import {
  ITEM_RELATIONSHIP_DAC_RESOURCE_NAME,
  ORMOperation,
} from "../../common/TypeInfoORM";
import {
  DACConstraint,
  DACDataItemResourceAccessResultMap,
  DACRole,
  getFlattenedDACConstraints,
  getResourceAccessByDACRole,
  mergeDACAccessResults,
} from "../DataAccessControl";
import { BaseItemRelationshipInfo } from "../../common";

// TODO: Create and export default DAC Roles for various, common purposes.

/**
 * Get the DAC Resource Path for a given data item.
 * */
export const getDataItemDACResourcePath = (
  prefixPath: LiteralValue[] = [],
  operation: ORMOperation,
  typeName: string,
  primaryKeyValue: LiteralValue,
): LiteralValue[] => [...prefixPath, operation, typeName, primaryKeyValue];

/**
 * Get the DAC Resource Path for a given relationship item.
 * */
export const getRelationshipItemDACResourcePath = (
  prefixPath: LiteralValue[] = [],
  operation: ORMOperation,
  itemRelationship: BaseItemRelationshipInfo,
): LiteralValue[] => {
  const {
    fromTypeName,
    fromTypeFieldName,
    fromTypePrimaryFieldValue,
    toTypePrimaryFieldValue,
  } = itemRelationship;

  return [
    ...prefixPath,
    operation,
    ITEM_RELATIONSHIP_DAC_RESOURCE_NAME,
    fromTypeName,
    fromTypeFieldName,
    fromTypePrimaryFieldValue,
    toTypePrimaryFieldValue,
  ];
};

/**
 * Get the DAC Resource Path for a given data item with a specific field value.
 * */
export const getDataItemFieldValueDACResourcePath = (
  itemPath: LiteralValue[],
  fieldName: string,
  fieldValue: LiteralValue,
): LiteralValue[] => [...itemPath, fieldName, fieldValue];

/**
 * Get the access to a given data item resource for a given DAC role.
 * */
export const getDACRoleHasAccessToDataItem = (
  prefixPath: LiteralValue[],
  operation: ORMOperation,
  typeName: string,
  dataItem: Partial<TypeInfoDataItem>,
  typeInfo: TypeInfo,
  role: DACRole,
  getDACRoleById: (id: string) => DACRole,
  cachedFlattenedConstraints?: DACConstraint[],
): DACDataItemResourceAccessResultMap => {
  const cleanItemPathPrefix = prefixPath ? prefixPath : [];
  const resultMap: DACDataItemResourceAccessResultMap = {
    allowed: false,
    denied: false,
    fieldsResources: {},
  };

  if (
    typeof dataItem === "object" &&
    dataItem !== null &&
    typeName &&
    typeInfo
  ) {
    const { primaryField, fields = {} } = typeInfo;

    if (primaryField) {
      const cleanPrimaryField = primaryField as keyof TypeInfoDataItem;
      const primaryFieldValue =
        typeof dataItem[cleanPrimaryField] === "undefined"
          ? null
          : dataItem[cleanPrimaryField];

      if (
        typeof primaryFieldValue !== "undefined" &&
        primaryFieldValue !== null &&
        !Array.isArray(primaryFieldValue)
      ) {
        const dataItemFields = Object.keys(dataItem);
        const primaryResourcePath = getDataItemDACResourcePath(
          cleanItemPathPrefix,
          operation,
          typeName,
          primaryFieldValue,
        );
        const internallyCachedFlattenedConstraints = cachedFlattenedConstraints
          ? cachedFlattenedConstraints
          : getFlattenedDACConstraints(role, getDACRoleById);
        const {
          allowed: primaryResourceAllowed,
          denied: primaryResourceDenied,
        } = getResourceAccessByDACRole(
          primaryResourcePath,
          role,
          getDACRoleById,
          internallyCachedFlattenedConstraints,
        );

        resultMap.allowed = primaryResourceAllowed;
        resultMap.denied = primaryResourceDenied;

        for (const dIF of dataItemFields) {
          const typeInfoField = fields[dIF];

          if (typeInfoField) {
            const { typeReference, array: fieldIsArray } = typeInfoField;

            if (!typeReference && !fieldIsArray) {
              const fieldResourcePath = getDataItemFieldValueDACResourcePath(
                primaryResourcePath,
                dIF,
                dataItem[dIF] as LiteralValue,
              );
              const {
                allowed: fieldResourceAllowed,
                denied: fieldResourceDenied,
              } = getResourceAccessByDACRole(
                fieldResourcePath,
                role,
                getDACRoleById,
                internallyCachedFlattenedConstraints,
              );

              resultMap.fieldsResources = {
                ...resultMap.fieldsResources,
                [dIF]: {
                  allowed: fieldResourceAllowed,
                  denied: fieldResourceDenied,
                },
              };
            }
          }
        }
      }
    }
  }

  return resultMap;
};

/**
 * Merge multiple DAC data item resource access result maps.
 * */
export const mergeDACDataItemResourceAccessResultMaps = (
  ...maps: DACDataItemResourceAccessResultMap[]
): DACDataItemResourceAccessResultMap => {
  let outputMap: DACDataItemResourceAccessResultMap = {
    allowed: false,
    denied: false,
    fieldsResources: {},
  };

  for (const m of maps) {
    const { fieldsResources: mFR = {} } = m;
    const { fieldsResources: oFR = {} } = outputMap;

    let newFieldsResources = {};

    for (const mFRField in mFR) {
      const mFRFieldData = mFR[mFRField];
      const oFRFieldData = oFR[mFRField];

      newFieldsResources = {
        ...newFieldsResources,
        [mFRField]: mergeDACAccessResults(mFRFieldData, oFRFieldData),
      };
    }

    outputMap = {
      ...mergeDACAccessResults(m, outputMap),
      fieldsResources: newFieldsResources,
    };
  }

  return outputMap;
};
