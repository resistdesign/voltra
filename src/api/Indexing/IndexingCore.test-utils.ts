import {
  decodeExactCursor,
  decodeLossyCursor,
  encodeExactCursor,
  encodeLossyCursor,
} from "./Cursor";
import { compareDocId, normalizeDocId } from "./docId";
import { tokenize, tokenizeLossyTrigrams } from "./tokenize";
import { createSearchTrace } from "./Trace";

const encodeBase64Url = (value: string): string =>
  Buffer.from(value, "utf8").toString("base64url");

const runIndexingCoreScenario = () => {
  const lossyEmpty = encodeLossyCursor();
  const lossyWithPlan = decodeLossyCursor(
    encodeLossyCursor({
      lastDocId: 5,
      plan: { primaryToken: "token", statsVersion: 2, sorting: "docIdAsc" },
    }),
  );
  const exactWithPending = decodeExactCursor(
    encodeExactCursor({
      lossy: { lastDocId: "a" },
      verification: {
        lastDocId: 2,
        pendingCandidates: [1, "2"],
        pendingOffset: 3,
      },
      plan: { primaryToken: "primary" },
    }),
  );

  let lossyWrongTypeError: string | undefined;
  try {
    decodeLossyCursor(
      encodeExactCursor({ lossy: { lastDocId: "x" } }) as string,
    );
  } catch (error: any) {
    lossyWrongTypeError = error?.message ?? String(error);
  }

  let exactWrongTypeError: string | undefined;
  try {
    decodeExactCursor(encodeLossyCursor({ lastDocId: "x" }) as string);
  } catch (error: any) {
    exactWrongTypeError = error?.message ?? String(error);
  }

  let invalidEncodingError: string | undefined;
  try {
    decodeLossyCursor("%%%");
  } catch (error: any) {
    invalidEncodingError = error?.message ?? String(error);
  }

  let invalidPayloadError: string | undefined;
  try {
    decodeLossyCursor(encodeBase64Url("not json"));
  } catch (error: any) {
    invalidPayloadError = error?.message ?? String(error);
  }

  let unsupportedPayloadError: string | undefined;
  try {
    decodeLossyCursor(encodeBase64Url(JSON.stringify({ v: 9, t: "lossy" })));
  } catch (error: any) {
    unsupportedPayloadError = error?.message ?? String(error);
  }

  let normalizeError: string | undefined;
  try {
    normalizeDocId("", "id");
  } catch (error: any) {
    normalizeError = error?.message ?? String(error);
  }

  const tokenized = tokenize("Crème brûlée!");
  const lossyTokens = tokenizeLossyTrigrams("hello");
  const lossyShort = tokenizeLossyTrigrams("hi");

  const trace = createSearchTrace();

  return {
    lossyEmpty: lossyEmpty ?? null,
    lossyWithPlan,
    exactWithPending,
    lossyWrongTypeError,
    exactWrongTypeError,
    invalidEncodingError,
    invalidPayloadError,
    unsupportedPayloadError,
    docIdCompare: [
      compareDocId("a", "a"),
      compareDocId("a", "b"),
      compareDocId("b", "a"),
    ],
    normalizedDocId: normalizeDocId(0, "id"),
    normalizeError,
    tokenized,
    lossyTokens: lossyTokens.tokens.sort(),
    lossyShortTokens: lossyShort.tokens.sort(),
    traceSnapshot: {
      postingsPages: trace.postingsPages,
      candidatesVerified: trace.candidatesVerified,
      batchGetCalls: trace.batchGetCalls,
      batchGetKeys: trace.batchGetKeys,
      ddbQueryCalls: trace.ddbQueryCalls,
      ddbBatchGetCalls: trace.ddbBatchGetCalls,
      ddbItemReadCalls: trace.ddbItemReadCalls,
    },
  };
};

export const runIndexingCoreLossyEmptyScenario = () =>
  runIndexingCoreScenario().lossyEmpty;

export const runIndexingCoreLossyWithPlanScenario = () =>
  runIndexingCoreScenario().lossyWithPlan;

export const runIndexingCoreExactWithPendingScenario = () =>
  runIndexingCoreScenario().exactWithPending;

export const runIndexingCoreLossyWrongTypeErrorScenario = () =>
  runIndexingCoreScenario().lossyWrongTypeError;

export const runIndexingCoreExactWrongTypeErrorScenario = () =>
  runIndexingCoreScenario().exactWrongTypeError;

export const runIndexingCoreInvalidEncodingErrorScenario = () =>
  runIndexingCoreScenario().invalidEncodingError;

export const runIndexingCoreInvalidPayloadErrorScenario = () =>
  runIndexingCoreScenario().invalidPayloadError;

export const runIndexingCoreUnsupportedPayloadErrorScenario = () =>
  runIndexingCoreScenario().unsupportedPayloadError;

export const runIndexingCoreDocIdCompareScenario = () =>
  runIndexingCoreScenario().docIdCompare;

export const runIndexingCoreNormalizedDocIdScenario = () =>
  runIndexingCoreScenario().normalizedDocId;

export const runIndexingCoreNormalizeErrorScenario = () =>
  runIndexingCoreScenario().normalizeError;

export const runIndexingCoreTokenizedScenario = () =>
  runIndexingCoreScenario().tokenized;

export const runIndexingCoreLossyTokensScenario = () =>
  runIndexingCoreScenario().lossyTokens;

export const runIndexingCoreLossyShortTokensScenario = () =>
  runIndexingCoreScenario().lossyShortTokens;

export const runIndexingCoreTraceSnapshotScenario = () =>
  runIndexingCoreScenario().traceSnapshot;
