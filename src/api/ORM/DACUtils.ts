/**
 * @packageDocumentation
 *
 * DAC path and constraint helpers for ORM resources. These helpers build
 * resource paths for types, items, and relationships so DAC rules can be
 * defined consistently across CRUD and relationship operations.
 *
 * Example: allow reads on a type.
 * ```ts
 * import { DACConstraintType } from "../DataAccessControl";
 * import { TypeOperation } from "../../common/TypeParsing/TypeInfo";
 * import { getItemTypeDACConstraint } from "./DACUtils";
 *
 * const allowBooks = getItemTypeDACConstraint(
 *   ["orm"],
 *   TypeOperation.READ,
 *   "Book",
 *   DACConstraintType.ALLOW,
 * );
 * ```
 */
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
} from "../../common/ItemRelationshipInfoTypes";

/**
 * Get the DAC Resource Path for a given operation performed using an ORM with the given DAC prefix.
 * @returns Resource path for the ORM operation.
 * */
export const getORMDACResourcePath = (
  /**
   * Path prefix identifying the ORM scope.
   */
  prefixPath: LiteralValue[] = [],
  /**
   * ORM operation name to append to the path.
   */
  operation: ORMOperation,
): LiteralValue[] => [...prefixPath, operation];

/**
 * Get the DAC Resource Path for a given item type.
 * @returns Resource path for the item type.
 * */
export const getItemTypeDACResourcePath = (
  /**
   * Path prefix identifying the ORM scope.
   */
  prefixPath: LiteralValue[] = [],
  /**
   * ORM operation name to append to the path.
   */
  operation: ORMOperation,
  /**
   * Type name to append to the path.
   */
  typeName: string,
): LiteralValue[] => [
  ...getORMDACResourcePath(prefixPath, operation),
  typeName,
];

/**
 * Get the DAC Resource Path for a given data item.
 * @returns Resource path for the data item.
 * */
export const getDataItemDACResourcePath = (
  /**
   * Path prefix identifying the ORM scope.
   */
  prefixPath: LiteralValue[] = [],
  /**
   * ORM operation name to append to the path.
   */
  operation: ORMOperation,
  /**
   * Type name to append to the path.
   */
  typeName: string,
  /**
   * Primary field value for the item.
   */
  primaryKeyValue: LiteralValue,
): LiteralValue[] => [
  ...getItemTypeDACResourcePath(prefixPath, operation, typeName),
  primaryKeyValue,
];

/**
 * Get the DAC Resource Path for a given item relationship origin.
 * @returns Resource path for the relationship origin.
 * */
export const getItemRelationshipOriginDACResourcePath = (
  /**
   * Path prefix identifying the ORM scope.
   */
  prefixPath: LiteralValue[] = [],
  /**
   * ORM operation name to append to the path.
   */
  operation: ORMOperation,
  /**
   * Relationship origin describing the source type and field.
   */
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
 * @returns Resource path for the relationship instance.
 * */
export const getItemRelationshipDACResourcePath = (
  /**
   * Path prefix identifying the ORM scope.
   */
  prefixPath: LiteralValue[] = [],
  /**
   * ORM operation name to append to the path.
   */
  operation: ORMOperation,
  /**
   * Relationship info containing source/target ids.
   */
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
 * @returns Resource path for the field value.
 * */
export const getDataItemFieldValueDACResourcePath = (
  /**
   * Base item resource path.
   */
  itemPath: LiteralValue[],
  /**
   * Field name to append to the path.
   */
  fieldName: string,
  /**
   * Field value to append to the path.
   */
  fieldValue: LiteralValue,
): LiteralValue[] => [...itemPath, fieldName, fieldValue];

/**
 * Get a DAC Constraint for a given item type.
 * @returns DAC constraint scoped to the type.
 * */
export const getItemTypeDACConstraint = (
  /**
   * Path prefix identifying the ORM scope.
   */
  prefixPath: LiteralValue[] = [],
  /**
   * ORM operation name to append to the path.
   */
  operation: ORMOperation,
  /**
   * Type name to constrain.
   */
  typeName: string,
  /**
   * Allow/deny constraint type.
   */
  constraintType: DACConstraintType,
): DACConstraint => ({
  type: constraintType,
  pathIsPrefix: true,
  resourcePath: getItemTypeDACResourcePath(prefixPath, operation, typeName),
});

/**
 * Get a DAC Constraint for a given item relationship origin.
 * @returns DAC constraint scoped to the relationship origin.
 * */
export const getItemRelationshipOriginDACConstraint = (
  /**
   * Path prefix identifying the ORM scope.
   */
  prefixPath: LiteralValue[] = [],
  /**
   * ORM operation name to append to the path.
   */
  operation: ORMOperation,
  /**
   * Relationship origin describing the source type and field.
   */
  itemRelationshipOrigin: ItemRelationshipOriginInfo,
  /**
   * Allow/deny constraint type.
   */
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
 * @returns DAC role with a single type constraint.
 * */
export const getItemTypeDACRole = (
  /**
   * Path prefix identifying the ORM scope.
   */
  prefixPath: LiteralValue[] = [],
  /**
   * ORM operation name to constrain.
   */
  operation: ORMOperation,
  /**
   * Type name to constrain.
   */
  typeName: string,
  /**
   * Allow/deny constraint type.
   */
  constraintType: DACConstraintType,
): BaseDACRole => ({
  constraints: [
    getItemTypeDACConstraint(prefixPath, operation, typeName, constraintType),
  ],
});

/**
 * Get a DAC Role for a given item type.
 * @returns DAC role with a single relationship-origin constraint.
 * */
export const getItemRelationshipOriginDACRole = (
  /**
   * Path prefix identifying the ORM scope.
   */
  prefixPath: LiteralValue[] = [],
  /**
   * ORM operation name to constrain.
   */
  operation: ORMOperation,
  /**
   * Relationship origin describing the source type and field.
   */
  itemRelationshipOrigin: ItemRelationshipOriginInfo,
  /**
   * Allow/deny constraint type.
   */
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
 * @returns DAC role that covers all operations under the prefix.
 * */
export const getFullORMDACRole = (
  /**
   * Path prefix identifying the ORM scope.
   */
  prefixPath: LiteralValue[] = [],
  /**
   * Allow/deny constraint type.
   */
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
 * @returns Access result map for the item and its fields.
 * */
export const getDACRoleHasAccessToDataItem = (
  /**
   * Path prefix identifying the ORM scope.
   */
  prefixPath: LiteralValue[],
  /**
   * ORM operation to evaluate.
   */
  operation: ORMOperation,
  /**
   * Type name for the item.
   */
  typeName: string,
  /**
   * Item to check access for.
   */
  dataItem: Partial<TypeInfoDataItem>,
  /**
   * Type info describing fields and primary key.
   */
  typeInfo: TypeInfo,
  /**
   * DAC role being evaluated.
   */
  role: DACRole,
  /**
   * Lookup helper used to resolve roles by id.
   */
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
 * @returns Merged access result map.
 * */
export const mergeDACDataItemResourceAccessResultMaps = (
  /**
   * Result maps to merge into a single access map.
   */
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
