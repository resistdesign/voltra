import { getEasyLayout } from "@resistdesign/voltra/web";

/**
 * Web EasyLayout reference example.
 */
export const webEasyLayoutExample = getEasyLayout(undefined, undefined, {
  gap: 12,
  padding: 16,
})`
  header header, 1fr
  side main, 2fr
  \ 1fr 2fr
`;
