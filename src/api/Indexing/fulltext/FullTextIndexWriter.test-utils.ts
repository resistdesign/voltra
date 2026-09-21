import {
  buildFullTextDocumentState,
  planFullTextDocumentMutation,
} from "./FullTextIndexWriter";

/**
 * Exact and lossy representations may share a token string.
 *
 * Removing the exact representation must not remove document-token membership
 * while a lossy representation still exists.
 */
export const runFullTextMembershipUnionScenario = () => {
  const previous = buildFullTextDocumentState("cat scatter");
  const next = buildFullTextDocumentState("scatter");
  const mutation = planFullTextDocumentMutation(previous, next);

  return {
    removesExactCat: mutation.removeExactTokens.includes("cat"),
    retainsLossyCat: next.lossyTokens.includes("cat"),
    doesNotRemoveCatMembership:
      !mutation.removeMembershipTokens.includes("cat"),
    removesObsoleteCatPrefixMembership:
      mutation.removeMembershipTokens.includes("cat*"),
  };
};
