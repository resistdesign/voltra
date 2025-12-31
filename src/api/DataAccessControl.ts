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
 *   getResourceAccessByDACRole,
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
 *
 * const getDACRoleById = async (id: string) =>
 *   id === readerRole.id ? readerRole : readerRole;
 *
 * const access = await getResourceAccessByDACRole(
 *   ["books", "public"],
 *   readerRole,
 *   getDACRoleById,
 * );
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
 * A wildcard segment used in DAC resource paths.
 * */
export type DACWildcardSignifier = {
  WILD_CARD: "*";
};

/**
 * A data access control (DAC) constraint.
 * */
export type DACResourcePathPart = LiteralValue | DACWildcardSignifier;

export type DACResourcePath = DACResourcePathPart[];

export type DACConstraint = {
  /**
   * Whether the constraint explicitly allows or denies access.
   */
  type: DACConstraintType;
  /**
   * The resource path to match against, in order of path segments.
   */
  resourcePath: DACResourcePath;
  /**
   * When true, match the resource path as a prefix instead of an exact match.
   */
  pathIsPrefix?: boolean;
};

/**
 * The primary properties for a data access control (DAC) role.
 * */
export type BaseDACRole = {
  /**
   * Child role ids whose constraints are included in this role.
   */
  childRoleIds?: string[];
  /**
   * Constraints directly assigned to this role.
   */
  constraints: DACConstraint[];
};

/**
 * A data access control (DAC) role which has been stored and can be accessed by an `id`.
 * */
export type DACRole = {
  /**
   * Stable role identifier used for lookups and inheritance.
   */
  id: string;
} & BaseDACRole;

/**
 * The result of a data access control (DAC) check.
 * */
export type DACAccessResult = {
  /**
   * True if any matching rule allows access.
   */
  allowed: boolean;
  /**
   * True if any matching rule denies access.
   */
  denied: boolean;
};

/**
 * The result of a data access control (DAC) check for a data item.
 * */
export type DACDataItemResourceAccessResultMap = DACAccessResult & {
  /**
   * Per-field access results, keyed by field name.
   */
  fieldsResources?: Record<string, DACAccessResult>;
};

/**
 * The result of matching a DAC path to a resource path.
 * */
export type DACPathMatchResults = {
  /**
   * True when the DAC path is a prefix of the resource path.
   */
  prefixMatch: boolean;
  /**
   * True when the DAC path matches the resource path exactly.
   */
  exactMatch: boolean;
};

/**
 * The prototype of a DAC wildcard signifier.
 * */
export const WILDCARD_SIGNIFIER_PROTOTYPE: DACWildcardSignifier = {
  WILD_CARD: "*",
};

/**
 * Check if a given DAC path part value is a DAC wildcard signifier.
 * @returns True when the value matches the wildcard signifier prototype.
 * */
export const getValueIsWildcardSignifier = (
  /**
   * Value to test against the wildcard signifier prototype.
   */
  value: any,
): boolean => {
  if (typeof value === "object" && value !== null) {
    return Object.keys(WILDCARD_SIGNIFIER_PROTOTYPE).every(
      (key) =>
        value[key] ===
        WILDCARD_SIGNIFIER_PROTOTYPE[key as keyof DACWildcardSignifier],
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
 * @returns Prefix and exact match flags for the comparison.
 * */
export const getDACPathsMatch = (
  /**
   * DAC constraint path to evaluate for prefix/exact matches.
   */
  dacPath: DACResourcePath,
  /**
   * Resource path to compare against the DAC path.
   */
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
 * @returns Flattened constraint list including child roles.
 * */
export const getFlattenedDACConstraints = async (
  /**
   * Role whose constraints (and child role constraints) are flattened.
   */
  role: DACRole,
  /**
   * Lookup helper used to resolve child roles by id.
   */
  getDACRoleById: (id: string) => Promise<DACRole>,
  /**
   * SECURITY: Don't use this if you want realtime role resolution.
   * */
  dacRoleCache?: Record<string, DACRole>,
): Promise<DACConstraint[]> => {
  const { childRoleIds = [], constraints = [] } = role;

  let flattenedConstraints: DACConstraint[] = [...constraints];

  for (const cRI of childRoleIds) {
    let childRole: DACRole;

    if (dacRoleCache && dacRoleCache[cRI]) {
      childRole = dacRoleCache[cRI];
    } else {
      childRole = await getDACRoleById(cRI);

      if (dacRoleCache) {
        dacRoleCache[cRI] = childRole;
      }
    }

    const childConstraints = await getFlattenedDACConstraints(
      childRole,
      getDACRoleById,
      dacRoleCache,
    );
    flattenedConstraints = [...flattenedConstraints, ...childConstraints];
  }

  return flattenedConstraints;
};

/**
 * Get the access to a given resource for a given DAC role.
 * @returns Allow/deny summary for the resource path.
 * */
export const getResourceAccessByDACRole = async (
  /**
   * Full resource path to test against the role's constraints.
   */
  fullResourcePath: LiteralValue[],
  /**
   * Role to evaluate for access on the given resource path.
   */
  role: DACRole,
  /**
   * Lookup helper used to resolve child roles by id.
   */
  getDACRoleById: (id: string) => Promise<DACRole>,
  /**
   * Optional cache to reuse resolved roles across calls.
   */
  dacRoleCache?: Record<string, DACRole>,
): Promise<DACAccessResult> => {
  const flattenedConstraints = await getFlattenedDACConstraints(
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
 * @returns Combined allow/deny result.
 * */
export const mergeDACAccessResults = (
  /**
   * Access results to merge into a single allow/deny summary.
   */
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
