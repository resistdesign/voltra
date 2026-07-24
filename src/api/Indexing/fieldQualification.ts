/**
 * @packageDocumentation
 *
 * Shared helpers for qualifying index fields by type name.
 */
import { encodeIndexIdentity } from "./IndexTable";

/** Version prefix for structural type/field identities. */
export const INDEX_FIELD_IDENTITY_VERSION = "f1";

/**
 * Build a fully-qualified index field name.
 * @param typeName Type name used to scope the field.
 * @param fieldName Field name to qualify.
 * @returns Qualified index field name.
 */
export function qualifyIndexField(typeName: string, fieldName: string): string {
  return [
    INDEX_FIELD_IDENTITY_VERSION,
    encodeIndexIdentity(typeName),
    encodeIndexIdentity(fieldName),
  ].join("#");
}
