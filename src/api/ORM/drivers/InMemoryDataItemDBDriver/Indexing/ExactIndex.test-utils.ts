import { ExactIndex } from "./ExactIndex";

const runExactIndexScenario = () => {
  const index = new ExactIndex();

  index.addDocument("doc-1", "text", ["hello", "world", "hello"]);
  index.addPositions("hello", "text", "doc-2", [0, 2]);
  index.addPositions("world", "text", "doc-2", [1]);

  const positionsDoc1Hello = index.getPositions("hello", "text", "doc-1");
  const positionsDoc2Hello = index.getPositions("hello", "text", "doc-2");

  const hasPhraseDoc1 = index.hasPhrase("doc-1", "text", ["hello", "world"]);
  const hasPhraseDoc2 = index.hasPhrase("doc-2", "text", ["hello", "world"]);
  const missingPhrase = index.hasPhrase("doc-1", "text", ["world", "hello"]);

  const candidates = ["doc-1", "doc-2", "doc-3"];
  const verifiedPage1 = index.verifyCandidates(
    ["hello", "world"],
    "text",
    candidates,
    {
      limit: 1,
    },
  );
  const verifiedPage2 = index.verifyCandidates(
    ["hello", "world"],
    "text",
    candidates,
    {
      limit: 1,
      lastDocId: verifiedPage1.nextCursor,
    },
  );

  index.removePositions("hello", "text", "doc-2");
  const positionsAfterRemove = index.getPositions("hello", "text", "doc-2");

  return {
    positionsDoc1Hello,
    positionsDoc2Hello,
    hasPhraseDoc1,
    hasPhraseDoc2,
    missingPhrase,
    verifiedPage1,
    verifiedPage2,
    positionsAfterRemove: positionsAfterRemove ?? null
  };
};

export const runExactIndexPositionsDoc1HelloScenario = () =>
  runExactIndexScenario().positionsDoc1Hello;

export const runExactIndexPositionsDoc2HelloScenario = () =>
  runExactIndexScenario().positionsDoc2Hello;

export const runExactIndexHasPhraseDoc1Scenario = () =>
  runExactIndexScenario().hasPhraseDoc1;

export const runExactIndexHasPhraseDoc2Scenario = () =>
  runExactIndexScenario().hasPhraseDoc2;

export const runExactIndexMissingPhraseScenario = () =>
  runExactIndexScenario().missingPhrase;

export const runExactIndexVerifiedPage1Scenario = () =>
  runExactIndexScenario().verifiedPage1;

export const runExactIndexVerifiedPage2Scenario = () =>
  runExactIndexScenario().verifiedPage2;

export const runExactIndexPositionsAfterRemoveScenario = () =>
  runExactIndexScenario().positionsAfterRemove;
