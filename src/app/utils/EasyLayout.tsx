/**
 * @packageDocumentation
 *
 * Render-agnostic EasyLayout helpers (template parsing + component wiring).
 */
import type { ComponentType, PropsWithChildren } from "react";
import { parseTemplate } from "./easy-layout/parseTemplate";
import type { TrackSpec } from "./easy-layout/types";
import { validateAreas } from "./easy-layout/validateAreas";

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
 * Optional spacing controls for generated layout CSS.
 */
export type EasyLayoutSpacing = {
  /**
   * CSS gap value for grid tracks.
   * If a number is provided, `px` is assumed.
   */
  gap?: number | string;
  /**
   * CSS padding value for the layout container.
   * If a number is provided, `px` is assumed.
   */
  padding?: number | string;
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
  spacing: EasyLayoutSpacing = {},
): {
  areasList: string[];
  css: string;
} => {
  const parsed = parseTemplate(layout);
  validateAreas(parsed);

  const renderTrack = (track: TrackSpec): string => {
    if (track.kind === "px") {
      return `${track.value}px`;
    }

    if (track.kind === "pct") {
      return `${track.value}%`;
    }

    return `${track.value}fr`;
  };

  const areaRows = parsed.areaGrid.map((row) => row.join(" "));
  const rows = parsed.rowTracks.map(renderTrack);
  let css = "";

  if (parsed.colTracks.length) {
    css += `\ngrid-template-columns: ${parsed.colTracks.map(renderTrack).join(" ")};`;
  }

  css += `\ngrid-template-areas:\n${areaRows.map((a) => `  "${a}"`).join("\n")};`;

  if (rows.length) {
    css += `\ngrid-template-rows: ${rows.join(" ")};`;
  }

  if (typeof spacing.gap !== "undefined") {
    css += `\ngap: ${typeof spacing.gap === "number" ? `${spacing.gap}px` : spacing.gap};`;
  }

  if (typeof spacing.padding !== "undefined") {
    css += `\npadding: ${
      typeof spacing.padding === "number" ? `${spacing.padding}px` : spacing.padding
    };`;
  }

  return {
    areasList: parsed.areaNames,
    css,
  };
};

/**
 * Parse a layout template string into area names and CSS.
 *
 * @param layout - Raw layout template string.
 * @param spacing - Optional gap/padding CSS settings.
 * @returns Area names and CSS for the grid template.
 */
export const getEasyLayoutTemplateDetails = (
  layout: string = "",
  spacing: EasyLayoutSpacing = {},
): {
  areasList: string[];
  css: string;
} => convertLayoutToCSS(layout, spacing);

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
 * @param spacing - Optional gap/padding CSS settings for generated layout styles.
 * @returns Tagged template helper that builds layout components.
 */
export const createEasyLayout = <TComponent,>(
  config: EasyLayoutFactoryConfig<TComponent>,
  extendFrom?: TComponent,
  areasExtendFrom?: TComponent,
  spacing: EasyLayoutSpacing = {},
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
    const { areasList, css } = convertLayoutToCSS(mergedTemplate, spacing);
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
