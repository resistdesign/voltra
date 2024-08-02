import { TypeInfoDataItem } from "../../app/components";
import { LiteralValue, TypeInfo } from "../../common/TypeParsing/TypeInfo";

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
  resourcePath: LiteralValue[];
  pathIsPrefix?: boolean;
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
 * The result of matching a DAC path to a resource path.
 * */
export type DACPathMatchResults = {
  prefixMatch: boolean;
  exactMatch: boolean;
};

/**
 * The prototype of a DAC wildcard signifier.
 * */
export const WILDCARD_SIGNIFIER_PROTOTYPE: Record<string, string> = {
  WILD_CARD: "*",
};

/**
 * Check if a given DAC path part value is a DAC wildcard signifier.
 * */
export const getValueIsWildcardSignifier = (value: any): boolean => {
  if (typeof value === "object" && value !== null) {
    return Object.keys(WILDCARD_SIGNIFIER_PROTOTYPE).every(
      (key) => value[key] === WILDCARD_SIGNIFIER_PROTOTYPE[key],
    );
  }

  return false;
};

/**
 * Check if a given DAC path matches a given resource path.
 *
 * Includes checking if the DAC path is a prefix of the
 * resource path and if the DAC path is an exact match of
 * the resource path.
 *
 * The DAC path can include wildcard signifier objects at
 * various indices in order to facilitate dynamic matches
 * and grouping by common resource aspects.
 * */
export const getDACPathsMatch = (
  dacPath: LiteralValue[],
  resourcePath: LiteralValue[],
): DACPathMatchResults => {
  const results: DACPathMatchResults = {
    prefixMatch: false,
    exactMatch: false,
  };

  let allDACPartsMatch = true;

  for (let i = 0; i < dacPath.length; i++) {
    const part = dacPath[i];
    const resourcePart = resourcePath[i];

    if (!getValueIsWildcardSignifier(part) && part !== resourcePart) {
      allDACPartsMatch = false;

      break;
    }
  }

  if (allDACPartsMatch) {
    results.prefixMatch = true;
  }

  if (dacPath.length !== resourcePath.length) {
    const lastDACPart = dacPath[dacPath.length - 1];
    const lastDACPartIsWildcard = getValueIsWildcardSignifier(lastDACPart);

    results.exactMatch = results.prefixMatch && lastDACPartIsWildcard;
  } else if (results.prefixMatch) {
    results.exactMatch = true;
  }

  return results;
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
  fullResourcePath: LiteralValue[],
  role: DACRole,
  getDACRoleById: (id: string) => DACRole,
): DACAccessResult => {
  const flattenedConstraints = getFlattenedDACConstraints(role, getDACRoleById);

  let allowed = false,
    denied = false,
    lastAllowedPath = [],
    lastDeniedPath = [];

  for (const constraint of flattenedConstraints) {
    const { type, resourcePath: dacPath, pathIsPrefix } = constraint;
    const {
      prefixMatch: dacPathIsPrefixOfResourcePath,
      exactMatch: dacPathIsExactMatch,
    } = getDACPathsMatch(dacPath, fullResourcePath);

    if (pathIsPrefix) {
      if (dacPathIsPrefixOfResourcePath) {
        if (type === DACConstraintType.ALLOW) {
          allowed = true;
          lastAllowedPath = dacPath;

          // IMPORTANT: Calculate specificity.
          if (lastAllowedPath.length > lastDeniedPath.length) {
            denied = false;
          }
        } else {
          denied = true;
          lastDeniedPath = dacPath;

          // IMPORTANT: Calculate specificity.
          if (lastDeniedPath.length > lastAllowedPath.length) {
            allowed = false;
          }
        }
      }
    } else {
      if (dacPathIsExactMatch) {
        lastAllowedPath = dacPath;
        lastDeniedPath = dacPath;

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
    const primaryFieldValue = dataItem[
      primaryField as keyof TypeInfoDataItem
    ] as LiteralValue;
    const dataItemFields = Object.keys(dataItem);
    const primaryResourcePath = [typeName, primaryFieldValue];
    const { allowed: primaryResourceAllowed, denied: primaryResourceDenied } =
      getResourceAccessByDACRole(primaryResourcePath, role, getDACRoleById);

    resultMap.primaryAllowed = primaryResourceAllowed && !primaryResourceDenied;

    for (const dIF of dataItemFields) {
      const typeInfoField = fields[dIF];

      if (typeInfoField) {
        const { typeReference, array: fieldIsArray } = typeInfoField;

        if (!typeReference && !fieldIsArray) {
          const fieldResourcePath = [
            typeName,
            primaryFieldValue as LiteralValue,
            dIF,
            dataItem[dIF] as LiteralValue,
          ];
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
