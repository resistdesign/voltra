import { createRequire } from "module";

const require = createRequire(import.meta.url);
const FIXED_ISO = "2020-01-01T00:00:00.000Z";

export const runGetSimpleIdScenario = () => {
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

  const modulePath = require.resolve("./getSimpleId");
  delete require.cache[modulePath];
  const { getSimpleId } = require("./getSimpleId");

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
