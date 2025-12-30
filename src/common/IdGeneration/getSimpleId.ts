let LAST_HAST_ID: number = 0;

const getBase64EncodedString = (input: string): string =>
  Buffer.from(input).toString("base64");

/**
 * Get a simple id, unique to the current run session.
 *
 * Includes a counter and timestamp so it stays unique within the same process.
 */
export const getSimpleId = () => {
  const hashId: number = LAST_HAST_ID++;
  const base64Datetime: string = getBase64EncodedString(
    new Date().toISOString(),
  );
  const rand1: string = Math.random().toString(36).substring(2, 15);
  const rand2: string = Math.random().toString(36).substring(2, 15);

  return `${hashId}-${base64Datetime}-${rand1}-${rand2}`;
};
