/**
 * @packageDocumentation
 *
 * Helper to define grid layouts with a concise template string and generated
 * area components. Use {@link getEasyLayout} to produce a layout container and
 * area components for each named grid area.
 */
import type { PropsWithChildren } from "react";
import styled from "../../app/helpers/styled";
import {
  createEasyLayout,
  type EasyLayoutFactoryConfig,
  type EasyLayoutSpacing,
  type FCWithChildren,
  type LayoutComponents,
} from "../../app/utils/EasyLayout";

type EasyLayoutStyledProps = PropsWithChildren<{
  as?: FCWithChildren;
  /** Precomputed CSS template injected into the static layout base component. */
  $layoutCss: string;
}>;

type EasyAreaStyledProps = PropsWithChildren<{
  as?: FCWithChildren;
  /** Grid area token assigned to the static area base component. */
  $area: string;
}>;

/**
 * Static base layout component to avoid creating styled-components per render.
 */
const EasyLayoutBase = styled("div")<{ $layoutCss: string }>`
  display: grid;
  ${({ $layoutCss }: { $layoutCss: string }) => $layoutCss}
`;

/**
 * Static base area component to avoid creating styled-components per render.
 */
const EasyAreaBase = styled("div")<{ $area: string }>`
  grid-area: ${({ $area }: { $area: string }) => $area};
`;

/**
 * Web factory for EasyLayout using static styled-components + transient props.
 * This avoids runtime warnings from dynamically creating styled components.
 */
const styledFactory: EasyLayoutFactoryConfig<FCWithChildren> = {
  createLayout: ({ base, css }) => {
    const LayoutComponent: FCWithChildren = ({ children }) => {
      const layoutProps: EasyLayoutStyledProps = {
        $layoutCss: css,
        children,
      };

      if (base) {
        layoutProps.as = base;
      }

      return <EasyLayoutBase {...layoutProps} />;
    };

    return LayoutComponent;
  },
  createArea: ({ base, area }) => {
    const AreaComponent: FCWithChildren = ({ children }) => {
      const areaProps: EasyAreaStyledProps = {
        $area: area,
        children,
      };

      if (base) {
        areaProps.as = base;
      }

      return <EasyAreaBase {...areaProps} />;
    };

    return AreaComponent;
  },
};

/**
 * Quickly express advanced, extensible grid layouts with styled-components.
 * Template syntax:
 * - Row lines: `<area area ...>, <track>`
 * - Optional column line: `\\ <track> <track> ...`
 *
 * Supported track units are `fr`, `px`, and `%`.
 * Parsing and area-shape validation are shared from the app EasyLayout core.
 * On web, final pixel distribution is resolved by the browser CSS Grid engine.
 * Optional spacing (`gap`, `padding`) can be provided in `options`.
 *
 * @example
 * ```tsx
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
 *
 * @param extendFrom - Base component to extend for the layout container.
 * @param areasExtendFrom - Base component to extend for each area component.
 * @param options - Optional layout spacing (`gap`, `padding`).
 * @returns Tagged template function that builds layout components.
 * */
export const getEasyLayout = (
  extendFrom?: FCWithChildren,
  areasExtendFrom?: FCWithChildren,
  options: EasyLayoutSpacing = {},
): ((
  layoutTemplate: TemplateStringsArray,
  ...expressions: any[]
) => LayoutComponents) => {
  return createEasyLayout(styledFactory, extendFrom, areasExtendFrom, options);
};
