import {
  buildStructuredTermKey,
  serializeStructuredValue,
} from "./StructuredDdb";
import { StructuredDdbWriter } from "./StructuredWriter";
import type { StructuredDocFieldsState } from "./StructuredDdb";

const runStructuredWriterConcurrentRetryScenario = async () => {
  const deletedTermKeys: string[] = [];
  const addedTermKeys: string[] = [];
  const deletedRangeKeys: string[] = [];
  const addedRangeKeys: string[] = [];
  let loadCalls = 0;
  let written = false;

  const writer = new StructuredDdbWriter(
    {
      loadDocFieldsState: async () => {
        loadCalls += 1;
        if (written) {
          return {
            fields: { "Post.score": 3 },
            version: 3,
            occupancyFields: {},
          };
        }
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
      putDocFieldsIfVersion: async (_docId, expectedVersion) => {
        written = expectedVersion === 2;
        return written;
      },
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
  let state:
    | { fields: { "Post.title": string }; version: number; occupancyFields: {} }
    | undefined;

  const writer = new StructuredDdbWriter(
    {
      loadDocFieldsState: async () => state,
      putDocFieldsIfVersion: async (_docId, _version, fields) => {
        state = {
          fields: fields as { "Post.title": string },
          version: 1,
          occupancyFields: {},
        };
        return true;
      },
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

export const runStructuredWriterPartialFailureRepairScenario = async () => {
  let state: StructuredDocFieldsState | undefined;
  let derivedCalls = 0;
  let repairedRangePuts = 0;
  let repairedOccupancyPuts = 0;
  const writer = new StructuredDdbWriter({
    loadDocFieldsState: async () => state,
    putDocFieldsIfVersion: async (
      _docId,
      expectedVersion,
      fields,
      occupancyFields,
    ) => {
      if ((state?.version ?? undefined) !== expectedVersion) {
        return false;
      }
      state = {
        fields,
        occupancyFields,
        version: (expectedVersion ?? 0) + 1,
      };
      return true;
    },
    putTermEntries: async () => {},
    deleteTermEntries: async () => {},
    putRangeEntries: async () => {},
    deleteRangeEntries: async () => {},
    loadOccupancyGenerationState: async () => ({
      pk: "generation",
      sk: "state",
      kind: "sg",
      activeGeneration: "g1",
      version: 1,
    }),
    writeDerivedEntries: async (mutation) => {
      derivedCalls += 1;
      if (derivedCalls === 1) {
        throw new Error("simulated partial batch failure");
      }
      repairedRangePuts = mutation.putRanges.length;
      repairedOccupancyPuts = mutation.putOccupancy.length;
    },
  });
  const context = {
    occupancyFields: {
      age: { type: "number" as const },
      name: { type: "string" as const },
    },
  };
  let failed = false;
  try {
    await writer.write("repair", { age: 23, name: "Zoe" }, context);
  } catch (_error) {
    failed = true;
  }
  await writer.write("repair", { age: 23, name: "Zoe" }, context);
  return {
    failed,
    derivedCalls,
    repairedRangePuts,
    repairedOccupancyPuts,
    finalVersion: state?.version,
  };
};
