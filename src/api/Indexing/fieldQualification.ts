/**
 * @packageDocumentation
 *
 * Shared helpers for qualifying index fields by type name.
 */

/**
 * Build a fully-qualified index field name.
 * @param typeName Type name used to scope the field.
 * @param fieldName Field name to qualify.
 * @returns Qualified index field name.
 */
export function qualifyIndexField(typeName: string, fieldName: string): string {
  return `${typeName}.${fieldName}`;
}
