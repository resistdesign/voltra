const CHAR_LIST_STRING = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

export const getAlphaNumericUUID = (length: number = 128) => {
  let result = '';
  for (let i = length; i > 0; --i) {
    const firstRandom = Math.random();
    const secondRandom = Math.random();
    const targetRandom = Math.random() > 0.5 ? firstRandom : secondRandom;

    result += CHAR_LIST_STRING[Math.floor(targetRandom * CHAR_LIST_STRING.length)];
  }
  return result;
};

export const getDelimitedAlphaNumericUUID = (numberOfSegments = 8, delimiter = '-', segmentLength = 4) =>
  new Array(numberOfSegments)
    .fill(0)
    .map(() => getAlphaNumericUUID(segmentLength))
    .join(delimiter);

export const getUUID = () => getDelimitedAlphaNumericUUID(32, '-', 4);
