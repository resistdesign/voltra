import { getTypeInfoMapFromTypeScript } from "@resistdesign/voltra/build";

/**
 * Build-time type parsing reference example.
 */
const source = "export type User = { id: string; name: string; };";

export const buildTypeInfoMapExample = getTypeInfoMapFromTypeScript(source);
