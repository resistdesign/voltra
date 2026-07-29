import {
  FullTextMemoryBackend,
  StructuredInMemoryBackend,
  createIndexBackend,
  type TypeInfoORMIndexingConfig,
} from "@resistdesign/voltra/api";

/**
 * Unified indexing reference:
 * - One logical backend composes the available physical index capabilities.
 * - `fieldsByType` is the source of truth for query planning and mutations.
 * - Public operators describe semantics, independent of physical storage.
 */
const values = new StructuredInMemoryBackend();
const text = new FullTextMemoryBackend();

export const ormIndexingConfigExample: TypeInfoORMIndexingConfig = {
  backend: createIndexBackend({
    values,
    valueWriter: values,
    text,
  }),
  tokenizer: {
    minNgramSize: 1,
    maxNgramSize: 3,
    maxIndexedStringLength: 128,
    maxTokensPerValue: 256,
  },
  fieldsByType: {
    Person: {
      firstName: { exact: true, text: { caseInsensitiveContains: true } },
      lastName: { exact: true, text: { caseInsensitiveContains: true } },
      age: { exact: true, range: { valueType: "number" } },
      dietaryRestrictions: { membership: true },
    },
    Car: {
      make: { exact: true },
      model: { exact: true, text: { prefix: true, lossy: true } },
      year: { exact: true, range: { valueType: "number" } },
    },
  },
  observability: {
    onListRoutingDecision: ({
      typeName,
      path,
      reason,
      criteriaCount,
      plan,
    }) => {
      console.log(
        `[ORM routing] type=${typeName} path=${path} reason=${reason} criteria=${criteriaCount} strategy=${plan?.strategy ?? "none"}`,
      );
    },
    onIndexWrite: ({ typeName, docId, action, fieldCount }) => {
      console.log(
        `[ORM index] type=${typeName} docId=${docId} action=${action} fields=${fieldCount}`,
      );
    },
  },
};
