import type { ReactElement } from "react";
import {
  type FCWithChildren,
  getEasyLayoutTemplateDetails,
  getPascalCaseAreaName,
} from "../../app/utils/EasyLayout";
import { getEasyLayout } from "./EasyLayout";

type RenderableFC<TProps> = (props: TProps) => ReactElement;

export const runEasyLayoutScenario = () => {
  const layout = `
    header header, 1fr
    side main, 2fr
    \\ 100px 1fr
  `;

  const details = getEasyLayoutTemplateDetails(layout);

  return {
    areasList: details.areasList,
    css: details.css.trim(),
    pascalCaseHeader: getPascalCaseAreaName("header"),
    pascalCaseMainContent: getPascalCaseAreaName("main-content"),
  };
};

export const runEasyLayoutRowsOptionalScenario = () => {
  const layout = `
    header header
    side main
    \\ 1fr 2fr
  `;

  const details = getEasyLayoutTemplateDetails(layout);

  return {
    areasList: details.areasList,
    css: details.css.trim(),
  };
};

export const runEasyLayoutInvalidShapeScenario = () => {
  try {
    getEasyLayoutTemplateDetails(`
      a a, 1fr
      a b, 1fr
      \\ 1fr 1fr
    `);
    return { ok: true, message: "" };
  } catch (err) {
    return { ok: false, message: (err as Error).message };
  }
};

export const runEasyLayoutSpacingScenario = () => {
  const details = getEasyLayoutTemplateDetails(
    `
      header header, 1fr
      side main, 2fr
      \\ 1fr 2fr
    `,
    {
      gap: 12,
      padding: "1rem",
    },
  );

  return {
    areasList: details.areasList,
    css: details.css.trim(),
  };
};

export const runWebEasyLayoutBaseForwardingScenario = () => {
  const LayoutBase: FCWithChildren = () => null;
  const AreaBase: FCWithChildren = () => null;
  const { layout: Layout, areas } = getEasyLayout(LayoutBase, AreaBase, {
    gap: 6,
    padding: "1rem",
  })`
    header main, 1fr
    \\ 2fr 1fr
  `;
  const renderLayout = Layout as unknown as RenderableFC<{ children?: unknown }>;
  const renderHeader = areas.Header as unknown as RenderableFC<{ children?: unknown }>;
  const renderMain = areas.Main as unknown as RenderableFC<{ children?: unknown }>;
  const layoutElement = renderLayout({
    children: "content",
  }) as ReactElement<{
    as?: FCWithChildren;
    $layoutCss?: string;
    children?: unknown;
  }>;
  const headerElement = renderHeader({
    children: "header",
  }) as ReactElement<{
    as?: FCWithChildren;
    $area?: string;
    children?: unknown;
  }>;
  const mainElement = renderMain({
    children: "main",
  }) as ReactElement<{
    as?: FCWithChildren;
    $area?: string;
    children?: unknown;
  }>;

  return {
    layoutUsesBase: layoutElement.props.as === LayoutBase,
    layoutContainsGap: layoutElement.props.$layoutCss?.includes("gap: 6px;") ?? false,
    layoutContainsPadding:
      layoutElement.props.$layoutCss?.includes("padding: 1rem;") ?? false,
    headerUsesBase: headerElement.props.as === AreaBase,
    headerAreaName: headerElement.props.$area,
    mainUsesBase: mainElement.props.as === AreaBase,
    mainAreaName: mainElement.props.$area,
  };
};

export const runWebEasyLayoutDefaultBaseScenario = () => {
  const { layout: Layout, areas } = getEasyLayout()`
    title content, 1fr
    \\ 1fr 2fr
  `;
  const renderLayout = Layout as unknown as RenderableFC<{ children?: unknown }>;
  const renderTitle = areas.Title as unknown as RenderableFC<{ children?: unknown }>;
  const layoutElement = renderLayout({
    children: "default-layout",
  }) as ReactElement<{
    as?: FCWithChildren;
    $layoutCss?: string;
  }>;
  const titleElement = renderTitle({
    children: "title",
  }) as ReactElement<{
    as?: FCWithChildren;
    $area?: string;
  }>;

  return {
    layoutUsesDefaultBase: typeof layoutElement.props.as === "undefined",
    areaUsesDefaultBase: typeof titleElement.props.as === "undefined",
    layoutHasTemplateAreas:
      layoutElement.props.$layoutCss?.includes("grid-template-areas:") ?? false,
    titleAreaName: titleElement.props.$area,
  };
};
