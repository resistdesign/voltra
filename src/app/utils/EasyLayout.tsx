import { FC, PropsWithChildren } from "react";
import styled from "styled-components";

/**
 * FC With Children
 * */
export type FCWithChildren = FC<PropsWithChildren>;

/**
 * Component Map
 * */
export type ComponentMap = Record<string, FCWithChildren>;

/**
 * Layout Components
 * */
export type LayoutComponents = {
  layout: FCWithChildren;
  areas: ComponentMap;
};

const getPascalCaseAreaName = (area: string): string => {
  return area
    .split("-")
    .map((a) => a[0].toUpperCase() + a.slice(1))
    .join("");
};

const convertLayoutToCSS = (
  layout: string = "",
): {
  areasList: string[];
  css: string;
} => {
  const lines = layout.split("\n");

  let areaRows: string[] = [];
  let rows: string[] = [];
  let css = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.indexOf("\\") === 0) {
      // Column Widths
      css += `\ngrid-template-columns: ${line.split("\\").join("").trim()};`;
    } else {
      const parts = line.split(",").map((p) => p && p.trim());

      if (parts[0]) {
        areaRows = [...areaRows, parts[0]];

        if (parts[1]) {
          rows = [...rows, parts[1]];
        }
      }
    }
  }

  css += `\ngrid-template-areas:\n${areaRows
    .filter((a) => !!(a && a.trim()))
    .map((a) => `  "${a}"`)
    .join("\n")};`;

  if (rows.length) {
    css += `\ngrid-template-rows: ${rows
      .filter((r) => !!(r && r.trim()))
      .join(" ")};`;
  }

  const areasList: string[] = Object.keys(
    areaRows
      .reduce(
        (acc, a) => [
          ...acc,
          ...a
            .split(" ")
            .map((a) => a && a.trim())
            .filter((a) => !!a),
        ],
        [] as string[],
      )
      .reduce((acc, a) => ({ ...acc, [a]: true }), {}),
  );

  return {
    areasList,
    css,
  };
};

/**
 * Quickly express advanced, extensible grid layouts with styled-components.
 *
 * @example
 * ```typescript
 * const {
 *   layout: Container,
 *   areas: {
 *     Header,
 *     Side,
 *     Main,
 *     Footer,
 *   },
 * } = getEasyLayout(styled.div)`
 *   header header header, 1fr
 *   side main main, 5fr
 *   footer footer footer, 1fr
 *   \\ 1fr 1fr 1fr
 * `;
 *
 * const App = () => {
 *   return (
 *     <Container>
 *       <Header>Header Content</Header>
 *       <Side>Side Content</Side>
 *       <Main>Main Content</Main>
 *       <Footer>Footer Content</Footer>
 *     </Container>
 *   );
 * };
 * ```
 * */
export const getEasyLayout = (
  extendFrom?: FCWithChildren,
  areasExtendFrom?: FCWithChildren,
): ((
  layoutTemplate: TemplateStringsArray,
  ...expressions: any[]
) => LayoutComponents) => {
  return (layoutTemplate, ...expressions) => {
    const mergedTemplate = layoutTemplate.reduce((acc, l, ind) => {
      const expr = expressions[ind - 1];
      const exprStr = typeof expr === "undefined" ? "" : expr;

      return `${acc}${l}${exprStr}`;
    }, "");
    const { areasList, css } = convertLayoutToCSS(mergedTemplate);
    const baseLayoutComp = extendFrom ? styled(extendFrom) : styled.div;
    const layout = baseLayoutComp`
    display: grid;
    ${css}
  `;
    const areas: ComponentMap = areasList.reduce((acc, area) => {
      const pascalCaseAreaName = getPascalCaseAreaName(area);
      const baseCompFunc = areasExtendFrom
        ? styled(areasExtendFrom)
        : styled.div;
      const component = baseCompFunc`
      grid-area: ${area};
    `;

      return {
        ...acc,
        [pascalCaseAreaName]: component,
      };
    }, {} as ComponentMap);

    return {
      layout,
      areas,
    };
  };
};
