/**
 * @packageDocumentation
 *
 * Render-agnostic EasyLayout helpers (template parsing + component wiring).
 */
import type { ComponentType, PropsWithChildren } from "react";

/**
 * FC With Children
 */
export type FCWithChildren = ComponentType<PropsWithChildren>;

/**
 * Component Map
 */
export type ComponentMap = Record<string, FCWithChildren>;

/**
 * Layout Components
 */
export type LayoutComponents = {
  /**
   * The generated layout container component.
   */
  layout: FCWithChildren;
  /**
   * Map of PascalCase area components keyed by area name.
   */
  areas: ComponentMap;
};

/**
 * Convert a kebab-cased area name into PascalCase.
 *
 * @param area - Area name from the layout template.
 * @returns PascalCase version of the area name.
 */
export const getPascalCaseAreaName = (area: string): string => {
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
 * Parse a layout template string into area names and CSS.
 *
 * @param layout - Raw layout template string.
 * @returns Area names and CSS for the grid template.
 */
export const getEasyLayoutTemplateDetails = (
  layout: string = "",
): {
  areasList: string[];
  css: string;
} => convertLayoutToCSS(layout);

/**
 * Configuration for building EasyLayout components.
 */
export type EasyLayoutFactoryConfig<TComponent> = {
  /**
   * Create a layout component with optional base component + css string.
   */
  createLayout: (options: {
    base?: TComponent;
    css: string;
  }) => FCWithChildren;
  /**
   * Create an area component with optional base component + grid area name.
   */
  createArea: (options: {
    base?: TComponent;
    area: string;
  }) => FCWithChildren;
};

/**
 * Build layout and area components from a template using a provided factory.
 *
 * @param config - Factory implementations for layout and areas.
 * @param extendFrom - Optional base component for the layout container.
 * @param areasExtendFrom - Optional base component for area components.
 * @returns Tagged template helper that builds layout components.
 */
export const createEasyLayout = <TComponent,>(
  config: EasyLayoutFactoryConfig<TComponent>,
  extendFrom?: TComponent,
  areasExtendFrom?: TComponent,
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
    const layout = config.createLayout({ base: extendFrom, css });
    const areas: ComponentMap = areasList.reduce((acc, area) => {
      const pascalCaseAreaName = getPascalCaseAreaName(area);
      const component = config.createArea({ base: areasExtendFrom, area });

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
