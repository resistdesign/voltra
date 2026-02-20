import { FullTextMemoryBackend } from "./FullTextMemoryBackend";
import {
  encodeDocKey,
  encodeDocMirrorKey,
  encodeDocTokenPositionSortKey,
  encodeDocTokenSortKey,
  encodeTokenDocSortKey,
  encodeTokenKey,
} from "./Schema";

const runFullTextMemoryBackendScenario = async () => {
  const backend = new FullTextMemoryBackend();

  await backend.addLossyPosting("hello", "text", "doc-1");
  await backend.addLossyPosting("hello", "text", "doc-2");
  await backend.addLossyPosting("world", "text", "doc-2");

  const lossyAll = await backend.loadLossyPostings("hello", "text");
  const lossyPage = await backend.queryLossyPostingsPage("hello", "text", {
    limit: 1,
  });

  await backend.addExactPositions("hello", "text", "doc-1", [0, 2]);
  await backend.addExactPositions("hello", "text", "doc-2", [1]);

  const exactDoc1 = await backend.loadExactPositions("hello", "text", "doc-1");
  const exactBatch = await backend.batchLoadExactPositions([
    { docId: "doc-1", indexField: "text", token: "hello" },
    { docId: "doc-2", indexField: "text", token: "hello" },
  ]);

  const tokenStats = await backend.loadTokenStats("hello", "text");
  const tokenStatsMissing = await backend.loadTokenStats("missing", "text");

  const hasDocToken = await backend.hasDocToken("doc-2", "text", "world");
  const hasDocTokenMissing = await backend.hasDocToken(
    "doc-3",
    "text",
    "hello",
  );
  const batchHas = await backend.batchHasDocTokens([
    { docId: "doc-1", indexField: "text", token: "hello" },
    { docId: "doc-2", indexField: "text", token: "world" },
    { docId: "doc-3", indexField: "text", token: "hello" },
  ]);

  await backend.removeLossyPosting("hello", "text", "doc-2");
  await backend.removeExactPositions("hello", "text", "doc-2");
  const lossyAfterRemove = await backend.loadLossyPostings("hello", "text");
  const exactAfterRemove = await backend.loadExactPositions(
    "hello",
    "text",
    "doc-2",
  );

  return {
    lossyAll,
    lossyPage,
    exactDoc1,
    exactBatch,
    tokenStats,
    tokenStatsMissing: tokenStatsMissing ?? null,
    hasDocToken,
    hasDocTokenMissing,
    batchHas,
    lossyAfterRemove,
    exactAfterRemove: exactAfterRemove ?? null,
    schema: {
      tokenKey: encodeTokenKey("text", "hello"),
      docKey: encodeDocKey("doc-1"),
      docMirrorKey: encodeDocMirrorKey("text", "doc-1"),
      tokenDocSortKey: encodeTokenDocSortKey("doc-1"),
      docTokenSortKey: encodeDocTokenSortKey("text", "hello"),
      docTokenPositionSortKey: encodeDocTokenPositionSortKey(
        "text",
        "hello",
        2,
      ),
    },
  };
};

export const runFullTextMemoryBackendLossyAllScenario = async () =>
  (await runFullTextMemoryBackendScenario()).lossyAll;

export const runFullTextMemoryBackendLossyPageScenario = async () =>
  (await runFullTextMemoryBackendScenario()).lossyPage;

export const runFullTextMemoryBackendExactDoc1Scenario = async () =>
  (await runFullTextMemoryBackendScenario()).exactDoc1;

export const runFullTextMemoryBackendExactBatchScenario = async () =>
  (await runFullTextMemoryBackendScenario()).exactBatch;

export const runFullTextMemoryBackendTokenStatsScenario = async () =>
  (await runFullTextMemoryBackendScenario()).tokenStats;

export const runFullTextMemoryBackendTokenStatsMissingScenario = async () =>
  (await runFullTextMemoryBackendScenario()).tokenStatsMissing;

export const runFullTextMemoryBackendHasDocTokenScenario = async () =>
  (await runFullTextMemoryBackendScenario()).hasDocToken;

export const runFullTextMemoryBackendHasDocTokenMissingScenario = async () =>
  (await runFullTextMemoryBackendScenario()).hasDocTokenMissing;

export const runFullTextMemoryBackendBatchHasScenario = async () =>
  (await runFullTextMemoryBackendScenario()).batchHas;

export const runFullTextMemoryBackendLossyAfterRemoveScenario = async () =>
  (await runFullTextMemoryBackendScenario()).lossyAfterRemove;

export const runFullTextMemoryBackendExactAfterRemoveScenario = async () =>
  (await runFullTextMemoryBackendScenario()).exactAfterRemove;

export const runFullTextMemoryBackendSchemaScenario = async () =>
  (await runFullTextMemoryBackendScenario()).schema;
