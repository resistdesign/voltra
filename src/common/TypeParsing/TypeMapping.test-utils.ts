import { convertASTToMap } from "./TypeMapping";
import { createSourceFile, ScriptTarget } from "typescript";

export const runTypeMappingScenario = () => {
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
  const keys = Object.keys(map).sort();

  return {
    keys,
  };
};
