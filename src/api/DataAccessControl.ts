/**
 * @packageDocumentation
 *
 * Role-based data access control (DAC) helpers that compare resource paths
 * against role constraints. Constraints can be exact matches or prefixes, and
 * can include wildcard signifiers for flexible path matching.
 *
 * Example role policy:
 * ```ts
 * import {
 *   DACConstraintType,
 *   DACRole,
 *   WILDCARD_SIGNIFIER_PROTOTYPE,
 * } from "./DataAccessControl";
 *
 * const wildcard = WILDCARD_SIGNIFIER_PROTOTYPE;
 * const readerRole: DACRole = {
 *   id: "reader",
 *   constraints: [
 *     {
 *       type: DACConstraintType.ALLOW,
 *       resourcePath: ["books", wildcard],
 *       pathIsPrefix: true,
 *     },
 *     {
 *       type: DACConstraintType.DENY,
 *       resourcePath: ["books", "restricted"],
 *       pathIsPrefix: true,
 *     },
 *   ],
 * };
 * ```
 */
import { LiteralValue } from "../common/TypeParsing/TypeInfo";

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
 * The primary properties for a data access control (DAC) role.
 * */
export type BaseDACRole = {
  childRoleIds?: string[];
  constraints: DACConstraint[];
};

/**
 * A data access control (DAC) role which has been stored and can be accessed by an `id`.
 * */
export type DACRole = {
  id: string;
} & BaseDACRole;

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
  /**
   * SECURITY: Don't use this if you want realtime role resolution.
   * */
  dacRoleCache?: Record<string, DACRole>,
): DACConstraint[] => {
  const { childRoleIds = [], constraints = [] } = role;

  let flattenedConstraints: DACConstraint[] = [...constraints];

  for (const cRI of childRoleIds) {
    let childRole: DACRole;

    if (dacRoleCache && dacRoleCache[cRI]) {
      childRole = dacRoleCache[cRI];
    } else {
      childRole = getDACRoleById(cRI);

      if (dacRoleCache) {
        dacRoleCache[cRI] = childRole;
      }
    }

    flattenedConstraints = [
      ...flattenedConstraints,
      ...getFlattenedDACConstraints(childRole, getDACRoleById, dacRoleCache),
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
  dacRoleCache?: Record<string, DACRole>,
): DACAccessResult => {
  const flattenedConstraints = getFlattenedDACConstraints(
    role,
    getDACRoleById,
    dacRoleCache,
  );

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
