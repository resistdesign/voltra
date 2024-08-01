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
  pathIsPrefix: boolean;
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
 * Get whether a resource access is allowed by a DAC role.
 * */
export const getResourceAccessIsAllowedByDACRole = (
  fullResourcePath: string,
  role: DACRole,
  getDACRoleById: (id: string) => DACRole,
): boolean => {
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

  return allowed && !denied;
};
