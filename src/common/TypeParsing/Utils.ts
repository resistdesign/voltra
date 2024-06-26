import { BUILTIN_TYPE_NAMES } from "./Constants";

export const typeNameIsBuiltIn = (typeName: string): boolean =>
  BUILTIN_TYPE_NAMES.includes(typeName) ||
  (typeName in globalThis &&
    typeof (globalThis as any)[typeName] === "function");
