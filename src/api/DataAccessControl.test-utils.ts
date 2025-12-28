import {
  DACConstraintType,
  WILDCARD_SIGNIFIER_PROTOTYPE,
  getValueIsWildcardSignifier,
  getDACPathsMatch,
  getFlattenedDACConstraints,
  getResourceAccessByDACRole,
  mergeDACAccessResults,
  type DACRole,
} from "./DataAccessControl";
import type { LiteralValue } from "../common/TypeParsing/TypeInfo";

export const runDataAccessControlScenario = () => {
  const wildcard = WILDCARD_SIGNIFIER_PROTOTYPE as unknown as LiteralValue;
  const wildcardMatch = getValueIsWildcardSignifier(wildcard);
  const wildcardMismatch = getValueIsWildcardSignifier({ WILD_CARD: "x" });

  const exactMatch = getDACPathsMatch(["a", "b"], ["a", "b"]);
  const prefixWildcardMatch = getDACPathsMatch(["a", wildcard], ["a", "b", "c"]);
  const noMatch = getDACPathsMatch(["a", "x"], ["a", "b"]);

  const roles: Record<string, DACRole> = {
    base: {
      id: "base",
      childRoleIds: ["child-1", "child-2"],
      constraints: [
        {
          type: DACConstraintType.ALLOW,
          resourcePath: ["root"],
          pathIsPrefix: true,
        },
      ],
    },
    "child-1": {
      id: "child-1",
      constraints: [
        {
          type: DACConstraintType.DENY,
          resourcePath: ["root", "private"],
          pathIsPrefix: true,
        },
      ],
    },
    "child-2": {
      id: "child-2",
      constraints: [
        {
          type: DACConstraintType.ALLOW,
          resourcePath: ["root", "public"],
        },
      ],
    },
  };
  const cache: Record<string, DACRole> = {};
  const flattened = getFlattenedDACConstraints(
    roles.base,
    (id) => roles[id],
    cache,
  );

  const accessSpecificity = getResourceAccessByDACRole(
    ["root", "private", "doc-1"],
    roles.base,
    (id) => roles[id],
  );
  const accessExactOverrides = getResourceAccessByDACRole(
    ["root", "public"],
    {
      id: "custom",
      constraints: [
        {
          type: DACConstraintType.DENY,
          resourcePath: ["root"],
          pathIsPrefix: true,
        },
        {
          type: DACConstraintType.ALLOW,
          resourcePath: ["root", "public"],
        },
      ],
    },
    () => roles.base,
  );

  const merged = mergeDACAccessResults(
    { allowed: false, denied: false },
    { allowed: true, denied: false },
    { allowed: false, denied: true },
  );

  return {
    wildcardMatch,
    wildcardMismatch,
    exactMatch,
    prefixWildcardMatch,
    noMatch,
    flattenedCount: flattened.length,
    cacheKeys: Object.keys(cache).sort(),
    accessSpecificity,
    accessExactOverrides,
    merged,
  };
};
