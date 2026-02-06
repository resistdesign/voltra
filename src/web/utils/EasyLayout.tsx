/**
 * @packageDocumentation
 *
 * Helper to define grid layouts with a concise template string and generated
 * area components. Use {@link getEasyLayout} to produce a layout container and
 * area components for each named grid area.
 */
import styled from "styled-components";
import {
  createEasyLayout,
  getEasyLayoutTemplateDetails,
  getPascalCaseAreaName,
  type EasyLayoutFactoryConfig,
  type EasyLayoutSpacing,
  type FCWithChildren,
  type LayoutComponents,
} from "../../app/utils/EasyLayout";

/**
 * Web factory for EasyLayout using styled-components.
 */
const styledFactory: EasyLayoutFactoryConfig<FCWithChildren> = {
  createLayout: ({ base, css }) => {
    const baseLayoutComp = base ? styled(base) : styled.div;
    return baseLayoutComp`
      display: grid;
      ${css}
    `;
  },
  createArea: ({ base, area }) => {
    const baseAreaComp = base ? styled(base) : styled.div;
    return baseAreaComp`
      grid-area: ${area};
    `;
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
