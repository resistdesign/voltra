let importSequence = 0;

const loadGetSimpleId = async () => {
  const moduleUrl = new URL("./getSimpleId.ts", import.meta.url);
  moduleUrl.search = `?t=${Date.now()}-${importSequence++}`;
  return import(moduleUrl.href);
};
const FIXED_ISO = "2020-01-01T00:00:00.000Z";

const getSimpleIdPairScenario = async () => {
  const originalRandom = Math.random;
  const originalDate = Date;
  const fakeRandom = 0.123456789;

  class FakeDate extends originalDate {
    constructor() {
      super(FIXED_ISO);
    }

    static now() {
      return new originalDate(FIXED_ISO).valueOf();
    }
  }

  (globalThis as any).Date = FakeDate;
  Math.random = () => fakeRandom;

  const { getSimpleId } = await loadGetSimpleId();

  const firstId: string = getSimpleId();
  const secondId: string = getSimpleId();

  (globalThis as any).Date = originalDate;
  Math.random = originalRandom;

  const expectedRand = fakeRandom.toString(36).substring(2, 15);
  const firstParts = firstId.split("-");
  const secondParts = secondId.split("-");

  return {
    firstId,
    secondId,
    firstCounter: firstParts[0],
    secondCounter: secondParts[0],
    decodedTimestamp: Buffer.from(firstParts[1], "base64").toString("utf8"),
    rand1: firstParts[2],
    rand2: firstParts[3],
    expectedRand,
  };
};

export const runGetSimpleIdFirstIdScenario = async () =>
  (await getSimpleIdPairScenario()).firstId;

export const runGetSimpleIdSecondIdScenario = async () =>
  (await getSimpleIdPairScenario()).secondId;

export const runGetSimpleIdFirstCounterScenario = async () =>
  (await getSimpleIdPairScenario()).firstCounter;

export const runGetSimpleIdSecondCounterScenario = async () =>
  (await getSimpleIdPairScenario()).secondCounter;

export const runGetSimpleIdDecodedTimestampScenario = async () =>
  (await getSimpleIdPairScenario()).decodedTimestamp;

export const runGetSimpleIdRand1Scenario = async () =>
  (await getSimpleIdPairScenario()).rand1;

export const runGetSimpleIdRand2Scenario = async () =>
  (await getSimpleIdPairScenario()).rand2;

export const runGetSimpleIdExpectedRandScenario = async () =>
  (await getSimpleIdPairScenario()).expectedRand;
