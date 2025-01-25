import {
  LiteralValue,
  TypeInfo,
  TypeInfoDataItem,
} from "../common/TypeParsing/TypeInfo";

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
  childRoleIds?: string[];
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
export type DACDataItemResourceAccessResultMap = DACAccessResult & {
  fieldsResources?: Record<string, DACAccessResult>;
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
  const { childRoleIds = [], constraints = [] } = role;

  let flattenedConstraints: DACConstraint[] = [...constraints];

  for (const cRI of childRoleIds) {
    const childRole = getDACRoleById(cRI);

    flattenedConstraints = [
      ...flattenedConstraints,
      ...getFlattenedDACConstraints(childRole, getDACRoleById),
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
  cachedFlattenedConstraints?: DACConstraint[],
): DACAccessResult => {
  const flattenedConstraints = cachedFlattenedConstraints
    ? cachedFlattenedConstraints
    : getFlattenedDACConstraints(role, getDACRoleById);

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
  itemPathPrefix?: LiteralValue[],
  cachedFlattenedConstraints?: DACConstraint[],
): DACDataItemResourceAccessResultMap => {
  const cleanItemPathPrefix = itemPathPrefix ? itemPathPrefix : [];
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
    const primaryFieldValue = dataItem[
      primaryField as keyof TypeInfoDataItem
    ] as LiteralValue;
    const dataItemFields = Object.keys(dataItem);
    const primaryResourcePath = [
      ...cleanItemPathPrefix,
      typeName,
      primaryFieldValue,
    ];
    const internallyCachedFlattenedConstraints = cachedFlattenedConstraints
      ? cachedFlattenedConstraints
      : getFlattenedDACConstraints(role, getDACRoleById);
    const { allowed: primaryResourceAllowed, denied: primaryResourceDenied } =
      getResourceAccessByDACRole(
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
          const fieldResourcePath = [
            ...primaryResourcePath,
            dIF,
            dataItem[dIF] as LiteralValue,
          ];
          const { allowed: fieldResourceAllowed, denied: fieldResourceDenied } =
            getResourceAccessByDACRole(
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

  return resultMap;
};

/**
 * Merge multiple DAC access results.
 * */
export const mergeDACAccessResults = (
  ...results: DACAccessResult[]
): DACAccessResult => {
  let newResult: DACAccessResult = {
    allowed: false,
    denied: false,
  };

  for (const r of results) {
    const { allowed: rAllowed, denied: rDenied } = r;
    const { allowed: nAllowed, denied: nDenied } = newResult;

    newResult = {
      allowed: rAllowed || nAllowed,
      denied: rDenied || nDenied,
    };
  }

  return newResult;
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
