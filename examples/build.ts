import { getTypeInfoMapFromTypeScript } from "@resistdesign/voltra/build";

const source = "export type User = { id: string; name: string; };";

export const buildTypeInfoMapExample = getTypeInfoMapFromTypeScript(source);
