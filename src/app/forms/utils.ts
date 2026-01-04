/**
 * @packageDocumentation
 *
 * Shared helpers for form generation.
 */

import type { TypeInfoField } from "../../common/TypeParsing/TypeInfo.js";

export const normalizeFieldTags = (
  tags?: TypeInfoField["tags"],
): TypeInfoField["tags"] => {
  if (!tags) {
    return undefined;
  }

  const { tags: nestedTags, ...rest } = tags as TypeInfoField["tags"] & {
    tags?: TypeInfoField["tags"];
  };

  if (nestedTags && typeof nestedTags === "object") {
    return {
      ...rest,
      ...nestedTags,
    };
  }

  return tags;
};
