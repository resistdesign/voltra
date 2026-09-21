import { normalizeDocId } from "../docId";
import { tokenize, tokenizeLossyTrigrams } from "../tokenize";
import type { DocId, DocumentRecord, DocumentIndexWriter } from "../Types";

/** Exact token positions retained for one logical full-text document field. */
export type FullTextExactTokenState = {
  token: string;
  positions: number[];
};

/** Storage-neutral logical state of one indexed document field. */
export type FullTextDocumentState = {
  /** Normalized source content when a document mirror is available. */
  normalizedContent?: string;
  /** Unique lossy-search tokens currently represented by the index. */
  lossyTokens: string[];
  /** Exact token positions currently represented by the index. */
  exactTokens: FullTextExactTokenState[];
};

/** Storage-neutral mutation planned for one indexed document field. */
export type FullTextDocumentMutation = {
  /** Normalized content to persist as the current mirror; undefined removes it. */
  normalizedContent?: string;
  /** Lossy postings that must be added. */
  addLossyTokens: string[];
  /** Lossy postings that must be removed. */
  removeLossyTokens: string[];
  /** Exact postings that must be created or replaced. */
  putExactTokens: FullTextExactTokenState[];
  /** Exact postings that must be removed. */
  removeExactTokens: string[];
  /** Document-token membership records that must be added. */
  addMembershipTokens: string[];
  /** Document-token membership records that must be removed. */
  removeMembershipTokens: string[];
};

/**
 * Storage operations required by the generic full-text document mutation
 * strategy. Drivers own only these persistence operations.
 */
export type FullTextDocumentWriterDependencies = {
  /** Read normalized persisted mirror content when available. */
  loadDocumentContent(
    docId: DocId,
    indexField: string,
  ): Promise<string | undefined>;
  /**
   * Inspect persisted artifacts when no mirror exists.
   *
   * The candidate sets are derived by the generic strategy from previous and
   * next document content so a driver can perform bounded reads.
   */
  loadDocumentArtifacts?(
    docId: DocId,
    indexField: string,
    candidates: {
      lossyTokens: string[];
      exactTokens: string[];
    },
  ): Promise<FullTextDocumentState>;
  /** Apply one already-planned logical mutation to backing storage. */
  applyDocumentMutation(
    docId: DocId,
    indexField: string,
    mutation: FullTextDocumentMutation,
  ): Promise<void>;
};

const resolveIndexText = (
  document: DocumentRecord,
  indexField: string,
): string => {
  const value = document[indexField];
  return value === null || typeof value === "undefined" ? "" : String(value);
};

const buildPositionMap = (tokens: string[]): Map<string, number[]> => {
  const positions = new Map<string, number[]>();
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    const current = positions.get(token) ?? [];
    current.push(index);
    positions.set(token, current);
  }
  return positions;
};

const exactStateMap = (
  state: FullTextDocumentState,
): Map<string, number[]> =>
  new Map(state.exactTokens.map(({ token, positions }) => [token, positions]));

const positionsEqual = (left: number[], right: number[]): boolean =>
  left.length === right.length &&
  left.every((value, index) => value === right[index]);

/** Build the logical full-text state represented by source content. */
export const buildFullTextDocumentState = (
  content: string,
): FullTextDocumentState => {
  const exact = tokenize(content);
  const lossy = tokenizeLossyTrigrams(content);
  const positions = buildPositionMap(exact.tokens);

  return {
    normalizedContent: exact.normalized || undefined,
    lossyTokens: Array.from(new Set(lossy.tokens)),
    exactTokens: Array.from(positions, ([token, tokenPositions]) => ({
      token,
      positions: tokenPositions,
    })),
  };
};

/** Plan an idempotent logical transition between two full-text states. */
export const planFullTextDocumentMutation = (
  previous: FullTextDocumentState,
  next: FullTextDocumentState,
): FullTextDocumentMutation => {
  const previousLossy = new Set(previous.lossyTokens);
  const nextLossy = new Set(next.lossyTokens);
  const previousExact = exactStateMap(previous);
  const nextExact = exactStateMap(next);
  const previousMembership = new Set([
    ...previous.lossyTokens,
    ...previousExact.keys(),
  ]);
  const nextMembership = new Set([
    ...next.lossyTokens,
    ...nextExact.keys(),
  ]);

  const addLossyTokens = Array.from(nextLossy).filter(
    (token) => !previousLossy.has(token),
  );
  const removeLossyTokens = Array.from(previousLossy).filter(
    (token) => !nextLossy.has(token),
  );
  const removeExactTokens = Array.from(previousExact.keys()).filter(
    (token) => !nextExact.has(token),
  );
  const putExactTokens = Array.from(nextExact, ([token, positions]) => ({
    token,
    positions,
  })).filter(({ token, positions }) => {
    const previousPositions = previousExact.get(token);
    return (
      !previousPositions || !positionsEqual(previousPositions, positions)
    );
  });

  const addMembershipTokens = Array.from(nextMembership).filter(
    (token) => !previousMembership.has(token),
  );
  const removeMembershipTokens = Array.from(previousMembership).filter(
    (token) => !nextMembership.has(token),
  );

  return {
    normalizedContent: next.normalizedContent,
    addLossyTokens,
    removeLossyTokens,
    putExactTokens,
    removeExactTokens,
    addMembershipTokens,
    removeMembershipTokens,
  };
};

const mergeCandidateTokens = (
  previous: FullTextDocumentState,
  next: FullTextDocumentState,
) => ({
  lossyTokens: Array.from(
    new Set([...previous.lossyTokens, ...next.lossyTokens]),
  ),
  exactTokens: Array.from(
    new Set([
      ...previous.exactTokens.map(({ token }) => token),
      ...next.exactTokens.map(({ token }) => token),
    ]),
  ),
});

const EMPTY_FULL_TEXT_DOCUMENT_STATE: FullTextDocumentState = {
  lossyTokens: [],
  exactTokens: [],
};

/**
 * Generic full-text document writer.
 *
 * Tokenization, diffing, exact-position semantics, lossy-posting semantics,
 * and previous/next reconciliation live here. Storage drivers only load and
 * apply logical state through {@link FullTextDocumentWriterDependencies}.
 */
export class FullTextIndexWriter implements DocumentIndexWriter {
  constructor(
    private readonly dependencies: FullTextDocumentWriterDependencies,
  ) {}

  async writeDocument(
    document: DocumentRecord,
    primaryField: string,
    indexField: string,
    indexFieldQualified = indexField,
    previousDocument?: DocumentRecord,
  ): Promise<void> {
    const docId = normalizeDocId(document[primaryField], primaryField);
    const nextState = buildFullTextDocumentState(
      resolveIndexText(document, indexField),
    );
    const mirrorContent = await this.dependencies.loadDocumentContent(
      docId,
      indexFieldQualified,
    );

    let previousState =
      typeof mirrorContent === "string"
        ? buildFullTextDocumentState(mirrorContent)
        : previousDocument
          ? buildFullTextDocumentState(
              resolveIndexText(previousDocument, indexField),
            )
          : EMPTY_FULL_TEXT_DOCUMENT_STATE;

    if (
      typeof mirrorContent === "undefined" &&
      previousDocument &&
      this.dependencies.loadDocumentArtifacts
    ) {
      previousState = await this.dependencies.loadDocumentArtifacts(
        docId,
        indexFieldQualified,
        mergeCandidateTokens(previousState, nextState),
      );
    }

    await this.dependencies.applyDocumentMutation(
      docId,
      indexFieldQualified,
      planFullTextDocumentMutation(previousState, nextState),
    );
  }
}
