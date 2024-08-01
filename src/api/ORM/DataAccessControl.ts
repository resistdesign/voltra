import { TypeInfoDataItem } from "../../app/components";
import { TypeInfo } from "../../common/TypeParsing/TypeInfo";
import { getPathString } from "../../common/Routing";

/**
 * The possible types of a data access control (DAC) constraint.
 * */
export enum DACConstraintType {
  ALLOW = "ALLOW",
  DENY = "DENY",
}

/**
 * A data access control (DAC) constraint.
 * */
export type DACConstraint = {
  type: DACConstraintType;
  resourcePath: string;
  pathIsPrefix?: boolean;
  wildcardIndices?: [fromIndex: number, toIndex: number][];
};

/**
 * A data access control (DAC) role.
 * */
export type DACRole = {
  id: string;
  parentRoleIds?: string[];
  constraints: DACConstraint[];
};

/**
 * The result of a data access control (DAC) check.
 * */
export type DACAccessResult = {
  allowed: boolean;
  denied: boolean;
};

/**
 * The result of a data access control (DAC) check for a data item.
 * */
export type DACDataItemResourceAccessResultMap = {
  primaryAllowed: boolean;
  fieldsResources?: Record<string, boolean>;
};

/**
 * Get the flattened constraints of a DAC role.
 * */
export const getFlattenedDACConstraints = (
  role: DACRole,
  getDACRoleById: (id: string) => DACRole,
): DACConstraint[] => {
  const { parentRoleIds = [], constraints = [] } = role;

  let flattenedConstraints: DACConstraint[] = [...constraints];

  for (const pRI of parentRoleIds) {
    const parentRole = getDACRoleById(pRI);

    flattenedConstraints = [
      ...flattenedConstraints,
      ...getFlattenedDACConstraints(parentRole, getDACRoleById),
    ];
  }

  return flattenedConstraints;
};

/**
 * Get the access to a given resource for a given DAC role.
 * */
export const getResourceAccessByDACRole = (
  // TODO: What about asterisk/wildcard path parts???
  fullResourcePath: string,
  role: DACRole,
  getDACRoleById: (id: string) => DACRole,
): DACAccessResult => {
  const flattenedConstraints = getFlattenedDACConstraints(role, getDACRoleById);

  let allowed = false,
    denied = false,
    lastAllowedPath = "",
    lastDeniedPath = "";

  for (const constraint of flattenedConstraints) {
    const { type, resourcePath, pathIsPrefix } = constraint;

    if (pathIsPrefix) {
      if (fullResourcePath.startsWith(resourcePath)) {
        if (type === DACConstraintType.ALLOW) {
          allowed = true;
          lastAllowedPath = resourcePath;

          if (lastAllowedPath.length > lastDeniedPath.length) {
            denied = false;
          }
        } else {
          denied = true;
          lastDeniedPath = resourcePath;

          if (lastDeniedPath.length > lastAllowedPath.length) {
            allowed = false;
          }
        }
      }
    } else {
      if (fullResourcePath === resourcePath) {
        lastAllowedPath = resourcePath;
        lastDeniedPath = resourcePath;

        if (type === DACConstraintType.ALLOW) {
          allowed = true;
        } else {
          denied = true;
        }
      }
    }
  }

  return { allowed, denied };
};

/**
 * Get the access to a given data item resource for a given DAC role.
 * */
export const getDACRoleHasAccessToDataItem = (
  dataItem: TypeInfoDataItem,
  typeName: string,
  typeInfo: TypeInfo,
  role: DACRole,
  getDACRoleById: (id: string) => DACRole,
): DACDataItemResourceAccessResultMap => {
  const resultMap: DACDataItemResourceAccessResultMap = {
    primaryAllowed: false,
    fieldsResources: {},
  };

  if (
    typeof dataItem === "object" &&
    dataItem !== null &&
    typeName &&
    typeInfo
  ) {
    const { primaryField, fields = {} } = typeInfo;
    const primaryFieldValue = dataItem[primaryField as keyof TypeInfoDataItem];
    const dataItemFields = Object.keys(dataItem);
    const primaryResourcePathParts = [typeName, primaryFieldValue];
    const primaryResourcePath = getPathString(primaryResourcePathParts);
    const { allowed: primaryResourceAllowed, denied: primaryResourceDenied } =
      getResourceAccessByDACRole(primaryResourcePath, role, getDACRoleById);

    resultMap.primaryAllowed = primaryResourceAllowed && !primaryResourceDenied;

    for (const dIF of dataItemFields) {
      const typeInfoField = fields[dIF];

      if (typeInfoField) {
        const { typeReference, array: fieldIsArray } = typeInfoField;

        if (!typeReference && !fieldIsArray) {
          const fieldResourcePathParts = [
            typeName,
            primaryFieldValue,
            dIF,
            dataItem[dIF],
          ];
          const fieldResourcePath = getPathString(fieldResourcePathParts);
          const { allowed: fieldResourceAllowed, denied: fieldResourceDenied } =
            getResourceAccessByDACRole(fieldResourcePath, role, getDACRoleById);

          resultMap.fieldsResources = {
            ...resultMap.fieldsResources,
            [dIF]: fieldResourceAllowed && !fieldResourceDenied,
          };
        }
      }
    }
  }

  return resultMap;
};
