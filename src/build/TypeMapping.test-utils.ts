import { convertASTToMap } from "./TypeMapping";
import { createSourceFile, ScriptTarget } from "typescript";

const getTypeMappingKeys = () => {
  const source = `
    namespace Outer {
      export type A = { id: string };
      export namespace Inner {
        export type B = { name: string };
      }
    }
    export type C = { value: number };
  `;
  const node = createSourceFile("map.ts", source, ScriptTarget.Latest, true);
  const map = convertASTToMap(node, {});
  return Object.keys(map).sort();
};

export const runTypeMappingTopLevelScenario = () => {
  const keys = getTypeMappingKeys();
  return keys.filter((key) => !key.includes("."));
};

export const runTypeMappingNestedNamespaceScenario = () => {
  const keys = getTypeMappingKeys();
  return keys.filter((key) => key.includes("."));
};
