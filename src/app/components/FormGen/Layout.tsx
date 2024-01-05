import styled, { css } from 'styled-components';

export const FORM_CONTROLS_GRID_AREA = 'FORM_CONTROLS_GRID_AREA';

export const getTypeStructureLayoutGridTemplate = (
  typeStructureLayout: string | boolean = '',
  topLevel: boolean = false
): string => {
  const hasTemplate = typeof typeStructureLayout === 'string' && !!typeStructureLayout.replace(/\s/g, () => '');

  if (hasTemplate) {
    const gridTemplateRows = typeStructureLayout
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => !!l);
    const maxColCount = gridTemplateRows.reduce((acc, row) => {
      const colCount = row.split(' ').length;

      return Math.max(acc, colCount);
    }, 1);
    const rowsWithControls = topLevel ? [...gridTemplateRows, FORM_CONTROLS_GRID_AREA] : gridTemplateRows;
    const filledGridTemplateRows = rowsWithControls.map((row) => {
      const existingCols = row.split(' ');
      const colCount = existingCols.length;
      const ratio = maxColCount / colCount;

      return existingCols
        .reduce((acc: string[], c: string, ind: number) => {
          const intRatio = ind === existingCols.length - 1 ? Math.ceil(ratio) : Math.floor(ratio);
          const newCols = new Array(intRatio).fill(c);

          return [...acc, ...newCols];
        }, [])
        .join(' ');
    });

    return filledGridTemplateRows.map((l) => `"${l}"`).join('\n');
  } else {
    return '';
  }
};

export type LayoutContainerProps = {
  $isGrid?: boolean;
  $gridTemplate?: string;
  $gridArea?: string;
  $allowShrink?: boolean;
};

export const LayoutDefaultColumnCSS = css`
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: stretch;
  width: 100%;
`;
export const LayoutMediaCSS = css`
  @media screen and (max-width: 768px) {
    ${LayoutDefaultColumnCSS}
  }
`;
export const getLayoutContainerCSS = ({ $isGrid = false, $gridTemplate, $gridArea }: LayoutContainerProps) => css`
  grid-area: ${$gridArea ? $gridArea : 'auto'};
  display: ${$isGrid ? 'grid' : 'flex'};
  grid-template: ${$gridTemplate ? $gridTemplate : 'auto'};
  gap: 1em;
  overflow: auto;

  ${!$gridTemplate ? LayoutDefaultColumnCSS : ''}

  ${LayoutMediaCSS}
`;
export const LayoutBox = styled.div<LayoutContainerProps>`
  ${(p) => getLayoutContainerCSS(p)}
`;
export const LayoutControls = styled.div`
  flex: 0 0 auto;
  display: flex;
  flex-direction: row;
  justify-content: stretch;
  align-items: center;
  gap: 1em;

  ${LayoutMediaCSS}
`;
