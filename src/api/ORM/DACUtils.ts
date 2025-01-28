import {
  LiteralValue,
  TypeInfo,
  TypeInfoDataItem,
} from "../../common/TypeParsing/TypeInfo";
import {
  ITEM_RELATIONSHIP_DAC_RESOURCE_NAME,
  OperationGroup,
  ORMOperation,
} from "../../common/TypeInfoORM";
import {
  BaseDACRole,
  DACConstraint,
  DACConstraintType,
  DACDataItemResourceAccessResultMap,
  DACRole,
  getResourceAccessByDACRole,
  mergeDACAccessResults,
} from "../DataAccessControl";
import {
  BaseItemRelationshipInfo,
  ItemRelationshipOriginInfo,
} from "../../common";

/**
 * Get the DAC Resource Path for a given operation performed using an ORM with the given DAC prefix.
 * */
export const getORMDACResourcePath = (
  prefixPath: LiteralValue[] = [],
  operation: ORMOperation,
): LiteralValue[] => [...prefixPath, operation];

/**
 * Get the DAC Resource Path for a given item type.
 * */
export const getItemTypeDACResourcePath = (
  prefixPath: LiteralValue[] = [],
  operation: ORMOperation,
  typeName: string,
): LiteralValue[] => [
  ...getORMDACResourcePath(prefixPath, operation),
  typeName,
];

/**
 * Get the DAC Resource Path for a given data item.
 * */
export const getDataItemDACResourcePath = (
  prefixPath: LiteralValue[] = [],
  operation: ORMOperation,
  typeName: string,
  primaryKeyValue: LiteralValue,
): LiteralValue[] => [
  ...getItemTypeDACResourcePath(prefixPath, operation, typeName),
  primaryKeyValue,
];

/**
 * Get the DAC Resource Path for a given item relationship origin.
 * */
export const getItemRelationshipOriginDACResourcePath = (
  prefixPath: LiteralValue[] = [],
  operation: ORMOperation,
  itemRelationshipOrigin: ItemRelationshipOriginInfo,
): LiteralValue[] => {
  const { fromTypeName, fromTypeFieldName } = itemRelationshipOrigin;

  return [
    ...getItemTypeDACResourcePath(
      prefixPath,
      operation,
      ITEM_RELATIONSHIP_DAC_RESOURCE_NAME,
    ),
    fromTypeName,
    fromTypeFieldName,
  ];
};

/**
 * Get the DAC Resource Path for a given item relationship.
 * */
export const getItemRelationshipDACResourcePath = (
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
    ...getItemTypeDACResourcePath(
      prefixPath,
      operation,
      ITEM_RELATIONSHIP_DAC_RESOURCE_NAME,
    ),
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
 * Get a DAC Constraint for a given item type.
 * */
export const getItemTypeDACConstraint = (
  prefixPath: LiteralValue[] = [],
  operation: ORMOperation,
  typeName: string,
  constraintType: DACConstraintType,
): DACConstraint => ({
  type: constraintType,
  pathIsPrefix: true,
  resourcePath: getItemTypeDACResourcePath(prefixPath, operation, typeName),
});

/**
 * Get a DAC Constraint for a given item relationship origin.
 * */
export const getItemRelationshipOriginDACConstraint = (
  prefixPath: LiteralValue[] = [],
  operation: ORMOperation,
  itemRelationshipOrigin: ItemRelationshipOriginInfo,
  constraintType: DACConstraintType,
): DACConstraint => ({
  type: constraintType,
  pathIsPrefix: true,
  resourcePath: getItemRelationshipOriginDACResourcePath(
    prefixPath,
    operation,
    itemRelationshipOrigin,
  ),
});

/**
 * Get a DAC Role for a given item type.
 * */
export const getItemTypeDACRole = (
  prefixPath: LiteralValue[] = [],
  operation: ORMOperation,
  typeName: string,
  constraintType: DACConstraintType,
): BaseDACRole => ({
  constraints: [
    getItemTypeDACConstraint(prefixPath, operation, typeName, constraintType),
  ],
});

/**
 * Get a DAC Role for a given item type.
 * */
export const getItemRelationshipOriginDACRole = (
  prefixPath: LiteralValue[] = [],
  operation: ORMOperation,
  itemRelationshipOrigin: ItemRelationshipOriginInfo,
  constraintType: DACConstraintType,
): BaseDACRole => ({
  constraints: [
    getItemRelationshipOriginDACConstraint(
      prefixPath,
      operation,
      itemRelationshipOrigin,
      constraintType,
    ),
  ],
});

/**
 * Get a DAC Role encompassing all operations for all types and relationships for an ORM with the given DAC prefix.
 * */
export const getFullORMDACRole = (
  prefixPath: LiteralValue[] = [],
  constraintType: DACConstraintType,
): BaseDACRole => ({
  constraints: [
    {
      type: constraintType,
      pathIsPrefix: true,
      resourcePath: getORMDACResourcePath(
        prefixPath,
        OperationGroup.ALL_OPERATIONS,
      ),
    },
  ],
});

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
  /**
   * SECURITY: Don't use this if you want realtime role resolution.
   * */
  dacRoleCache?: Record<string, DACRole>,
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
        const {
          allowed: primaryResourceAllowed,
          denied: primaryResourceDenied,
        } = getResourceAccessByDACRole(
          primaryResourcePath,
          role,
          getDACRoleById,
          dacRoleCache,
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
                dacRoleCache,
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
    const fRFieldNames = [...Object.keys(mFR), ...Object.keys(oFR)];

    let newFieldsResources = {};

    for (const mFRField of fRFieldNames) {
      const mFRFieldData = mFR[mFRField] || {
        allowed: false,
        denied: false,
      };
      const oFRFieldData = oFR[mFRField] || {
        allowed: false,
        denied: false,
      };

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
