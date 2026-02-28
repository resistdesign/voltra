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
  observability: {
    onListRoutingDecision: ({ typeName, path, reason, criteriaCount }) => {
      console.log(
        `[ORM routing] type=${typeName} path=${path} reason=${reason} criteria=${criteriaCount}`,
      );
    },
    onStructuredIndexWrite: ({ typeName, docId, action, indexedFieldCount }) => {
      console.log(
        `[ORM structured-index] type=${typeName} docId=${docId} action=${action} indexedFields=${indexedFieldCount}`,
      );
    },
  },
};
