import type { TypeInfoORMIndexingConfig } from "@resistdesign/voltra/api";

/**
 * Structured indexing reference:
 * - Field inclusion is explicit via `indexedFieldsByType`.
 * - Primary fields are resolved from runtime TypeInfo in the ORM.
 * - Operator behavior is framework-defined by type/operator semantics.
 */
export const ormStructuredIndexingConfigExample: TypeInfoORMIndexingConfig = {
  structured: {
    reader: {} as any,
    writer: {} as any,
    indexedFieldsByType: {
      Person: ["firstName", "lastName", "age", "dietaryRestrictions"],
      Car: ["make", "model", "year"],
    },
  },
};

