import {
  buildLossyS3Key,
  loadLossyIndex,
  storeLossyIndex,
  type LossyS3Pointer,
} from "./LossyS3";

const runLossyS3MemoryScenario = async () => {
  const pointer: LossyS3Pointer = {
    bucket: "test-bucket",
    key: buildLossyS3Key("hello world", "text"),
  };
  const missingPointer: LossyS3Pointer = {
    bucket: "test-bucket",
    key: buildLossyS3Key("missing", "text"),
  };

  await storeLossyIndex(pointer, [1, "2", 3]);

  return {
    key: pointer.key,
    loaded: await loadLossyIndex(pointer),
    missing: await loadLossyIndex(missingPointer),
  };
};

export const runLossyS3MemoryKeyScenario = async () =>
  (await runLossyS3MemoryScenario()).key;

export const runLossyS3MemoryLoadedScenario = async () =>
  (await runLossyS3MemoryScenario()).loaded;

export const runLossyS3MemoryMissingScenario = async () =>
  (await runLossyS3MemoryScenario()).missing;
