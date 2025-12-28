import { ExactIndex } from "./exactIndex";
import { buildExactDdbItem, buildExactDdbKey } from "./exactDdb";

export const runExactIndexScenario = () => {
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
  const verifiedPage1 = index.verifyCandidates(["hello", "world"], "text", candidates, {
    limit: 1,
  });
  const verifiedPage2 = index.verifyCandidates(["hello", "world"], "text", candidates, {
    limit: 1,
    lastDocId: verifiedPage1.nextCursor,
  });

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
    positionsAfterRemove: positionsAfterRemove ?? null,
    ddbKey: buildExactDdbKey("token", "text", "doc-1"),
    ddbItem: buildExactDdbItem("token", "text", "doc-1", [3, 4]),
  };
};
