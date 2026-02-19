import { LossyIndex } from "./LossyIndex";
import { buildLossyDdbKey } from "./LossyDdb";

const runLossyIndexScenario = () => {
  const index = new LossyIndex();

  index.addPosting("hello", "text", "doc-2");
  index.addPosting("hello", "text", "doc-1");
  index.addPosting("hello", "text", "doc-1");
  index.addPosting("world", "text", "doc-3");

  const postingsAll = index.getPostings("hello", "text");
  const postingsPage = index.getPostings("hello", "text", {
    limit: 1,
  });
  const postingsPage2 = index.getPostings("hello", "text", {
    limit: 1,
    lastDocId: postingsPage.nextCursor,
  });

  index.removePosting("hello", "text", "doc-2");
  const postingsAfterRemove = index.getPostings("hello", "text");

  const docIndex = new LossyIndex();
  docIndex.addDocument("doc-4", "text", ["alpha", "alpha", "beta"]);
  const postingsAlpha = docIndex.getPostings("alpha", "text");

  return {
    postingsAll,
    postingsPage,
    postingsPage2,
    postingsAfterRemove,
    postingsAlpha,
    ddbKey: buildLossyDdbKey("token", "text", "doc-1"),
  };
};

export const runLossyIndexPostingsAllScenario = () =>
  runLossyIndexScenario().postingsAll;

export const runLossyIndexPostingsPageScenario = () =>
  runLossyIndexScenario().postingsPage;

export const runLossyIndexPostingsPage2Scenario = () =>
  runLossyIndexScenario().postingsPage2;

export const runLossyIndexPostingsAfterRemoveScenario = () =>
  runLossyIndexScenario().postingsAfterRemove;

export const runLossyIndexPostingsAlphaScenario = () =>
  runLossyIndexScenario().postingsAlpha;

export const runLossyIndexDdbKeyScenario = () => runLossyIndexScenario().ddbKey;
