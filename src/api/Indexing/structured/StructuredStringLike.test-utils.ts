import {
  buildStructuredLikePatternTokens,
  buildStructuredStringContainsTokens,
} from "./StructuredStringLike";
import { StructuredInMemoryBackend } from "./StructuredInMemoryBackend";
import { searchStructured } from "./SearchStructured";

export const structuredStringEmojiTokenBoundaryTokens = () =>
  buildStructuredStringContainsTokens("a🌹b", {
    minNgramSize: 3,
    maxNgramSize: 3,
  });

export const structuredStringEmojiTruncationBoundaryTokens = () =>
  buildStructuredStringContainsTokens("ab🌹cd", {
    minNgramSize: 1,
    maxNgramSize: 1,
    maxIndexedStringLength: 3,
  });

export const structuredStringMixedUnicodeTokens = () =>
  buildStructuredStringContainsTokens("A🌹é😊", {
    minNgramSize: 2,
    maxNgramSize: 2,
  });

export const structuredStringConsecutiveEmojiTokens = () =>
  buildStructuredStringContainsTokens("🌹😊🚀", {
    minNgramSize: 2,
    maxNgramSize: 2,
  });

export const structuredStringAsciiRegressionTokens = () =>
  buildStructuredStringContainsTokens("Honda");

const runStructuredStringUnicodeQueryScenario = async () => {
  const backend = new StructuredInMemoryBackend();

  await backend.write("rose", { label: "Omega 🌹 Sunrise" });
  await backend.write("rocket", { label: "Omega 🚀 Sunrise" });

  const exact = await searchStructured(
    backend,
    {
      type: "term",
      field: "label",
      mode: "eq",
      value: "Omega 🌹 Sunrise",
    },
    { limit: 10 },
  );
  const likeTokens = buildStructuredLikePatternTokens("🌹");
  const like = await searchStructured(
    backend,
    likeTokens.length === 1
      ? {
          type: "term",
          field: "label",
          mode: "contains",
          value: likeTokens[0],
        }
      : {
          and: likeTokens.map((value) => ({
            type: "term" as const,
            field: "label",
            mode: "contains" as const,
            value,
          })),
        },
    { limit: 10 },
  );

  return {
    exactIds: exact.candidateIds,
    likeIds: like.candidateIds,
  };
};

export const runStructuredStringUnicodeExactIdsScenario = async () =>
  (await runStructuredStringUnicodeQueryScenario()).exactIds;

export const runStructuredStringUnicodeLikeIdsScenario = async () =>
  (await runStructuredStringUnicodeQueryScenario()).likeIds;
