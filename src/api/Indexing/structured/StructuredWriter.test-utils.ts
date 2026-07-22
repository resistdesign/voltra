import {
  buildStructuredTermKey,
  serializeStructuredValue,
} from "./StructuredDdb";
import { StructuredDdbWriter } from "./StructuredWriter";

const runStructuredWriterConcurrentRetryScenario = async () => {
  const deletedTermKeys: string[] = [];
  const addedTermKeys: string[] = [];
  const deletedRangeKeys: string[] = [];
  const addedRangeKeys: string[] = [];
  let loadCalls = 0;

  const writer = new StructuredDdbWriter(
    {
      loadDocFieldsState: async () => {
        loadCalls += 1;
        if (loadCalls === 1) {
          return {
            fields: {
              "Post.score": 1,
            },
            version: 1,
          };
        }

        return {
          fields: {
            "Post.score": 2,
          },
          version: 2,
        };
      },
      putDocFieldsIfVersion: async (_docId, expectedVersion) =>
        expectedVersion === 2,
      putTermEntries: async (entries) => {
        addedTermKeys.push(...entries.map((entry) => entry.pk));
      },
      deleteTermEntries: async (entries) => {
        deletedTermKeys.push(...entries.map((entry) => entry.pk));
      },
      putRangeEntries: async (entries) => {
        addedRangeKeys.push(...entries.map((entry) => entry.sk));
      },
      deleteRangeEntries: async (entries) => {
        deletedRangeKeys.push(...entries.map((entry) => entry.sk));
      },
    },
    {
      maxConcurrentWriteRetries: 4,
    },
  );

  await writer.write("doc-1", {
    "Post.score": 3,
  });

  const staleTermKey = buildStructuredTermKey("Post.score", 1, "eq");
  const latestTermKey = buildStructuredTermKey("Post.score", 2, "eq");
  const nextTermKey = buildStructuredTermKey("Post.score", 3, "eq");

  return {
    loadCalls,
    deletedStaleTermSeen: deletedTermKeys.includes(staleTermKey),
    deletedLatestTermSeen: deletedTermKeys.includes(latestTermKey),
    addedNextTermSeen: addedTermKeys.includes(nextTermKey),
    rangeDeleteCount: deletedRangeKeys.length,
    rangeAddCount: addedRangeKeys.length,
  };
};

const runStructuredWriterTokenizerConfigScenario = async () => {
  const addedContainsValues: string[] = [];

  const writer = new StructuredDdbWriter(
    {
      loadDocFieldsState: async () => undefined,
      putDocFieldsIfVersion: async () => true,
      putTermEntries: async (entries) => {
        addedContainsValues.push(
          ...entries
            .filter((entry) => entry.mode === "contains")
            .map((entry) => String(entry.value)),
        );
      },
      deleteTermEntries: async () => {},
      putRangeEntries: async () => {},
      deleteRangeEntries: async () => {},
    },
    {
      tokenizer: {
        minNgramSize: 2,
        maxNgramSize: 2,
      },
    },
  );

  await writer.write("doc-1", {
    "Post.title": "AB",
  });

  return {
    hasBigramToken: addedContainsValues.includes("__str__:ab"),
    hasUnigramToken: addedContainsValues.includes("__str__:a"),
  };
};

export const runStructuredWriterConcurrentRetryScenarioResult = async () =>
  runStructuredWriterConcurrentRetryScenario();

export const runStructuredWriterTokenizerConfigScenarioResult = async () =>
  runStructuredWriterTokenizerConfigScenario();

export const runStructuredNumericKeyOrderingScenario = () => {
  const values = [-230, -10, -1, 0, 0.5, 2, 23, 34, 230];
  const ordered = values
    .map((value) => ({ value, key: serializeStructuredValue(value) }))
    .sort((left, right) => left.key.localeCompare(right.key))
    .map(({ value }) => value);

  let rejectsInfinity = false;
  try {
    serializeStructuredValue(Number.POSITIVE_INFINITY);
  } catch (_error) {
    rejectsInfinity = true;
  }

  return {
    ordered,
    negativeZeroNormalized:
      serializeStructuredValue(-0) === serializeStructuredValue(0),
    rejectsInfinity,
  };
};
