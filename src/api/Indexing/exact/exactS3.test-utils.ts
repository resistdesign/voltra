import {
  buildExactS3Key,
  loadExactPositions,
  storeExactPositions,
  type ExactS3Pointer,
} from "./exactS3";

export const runExactS3MemoryScenario = async () => {
  const pointer: ExactS3Pointer = {
    bucket: "test-bucket",
    key: buildExactS3Key("hello world", "text", "doc-1"),
  };
  const missingPointer: ExactS3Pointer = {
    bucket: "test-bucket",
    key: buildExactS3Key("missing", "text", "doc-2"),
  };

  await storeExactPositions(pointer, [1, 3, 5]);

  return {
    key: pointer.key,
    loaded: await loadExactPositions(pointer),
    missing: await loadExactPositions(missingPointer),
  };
};
