import { CORSPatter } from './Types';

export const originMatchesString = (origin: string = '', str: string = ''): boolean => str === origin;

export const originMatchesRegExp = (origin: string = '', regExp: RegExp = /^$/): boolean => !!regExp.test(origin);

export const originMatches = (origin: string = '', corsPattern: CORSPatter = ''): boolean => {
  if (typeof corsPattern === 'string') {
    return originMatchesString(origin, corsPattern);
  } else {
    return originMatchesRegExp(origin, corsPattern);
  }
};
export const getAllowedCORSOrigin = (origin: string = '', corsPatterns: CORSPatter[] = []): string =>
  !!corsPatterns.find((cP) => originMatches(origin, cP)) ? origin : '';

export const getHeadersWithCORS = (origin: string = '', corsPatterns: CORSPatter[] = []): Record<string, string> => {
  return {
    'Access-Control-Allow-Origin': getAllowedCORSOrigin(origin, corsPatterns),
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Authorization',
    'Access-Control-Allow-Methods': 'OPTIONS, HEAD, GET, POST, PUT, PATCH, DELETE',
  };
};
