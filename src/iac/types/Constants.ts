/**
 * Type string used when a resolved type is missing.
 */
export const NEVER_TYPE = "never";

/**
 * Namespace delimiter definitions for CloudFormation types.
 */
export const NAMESPACE_DELIMITERS = {
  INPUT_REGEX: /::/gim,
  INPUT: "::",
  OUTPUT: ".",
};

/**
 * Type name used for CloudFormation tags.
 */
export const TAG_TYPE = "Tag";

/**
 * Supported container type names in the spec.
 */
export const CONTAINER_TYPES = ["List", "Map"];

/**
 * CloudFormation primitive type map to TypeScript types.
 */
export const PRIMITIVE_TYPE_MAP: Record<string, string> = {
  String: "string",
  Integer: "number",
  Boolean: "boolean",
  Double: "number",
  Json: "Json",
  Timestamp: "Timestamp",
  Long: "number",
};
