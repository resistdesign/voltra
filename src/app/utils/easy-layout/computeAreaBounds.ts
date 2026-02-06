import type { AreaBounds, EasyLayoutParsed } from "./types";

/**
 * Compute 1-based row/column bounds for each area name.
 */
export const computeAreaBounds = (
  parsed: EasyLayoutParsed,
): Record<string, AreaBounds> => {
  const result: Record<string, AreaBounds> = {};

  for (let rowIndex = 0; rowIndex < parsed.areaGrid.length; rowIndex++) {
    const row = parsed.areaGrid[rowIndex];

    for (let colIndex = 0; colIndex < row.length; colIndex++) {
      const name = row[colIndex];
      if (!name || name === ".") {
        continue;
      }

      const row1 = rowIndex + 1;
      const col1 = colIndex + 1;
      const existing = result[name];

      if (!existing) {
        result[name] = {
          name,
          rowStart: row1,
          rowEnd: row1,
          colStart: col1,
          colEnd: col1,
        };
        continue;
      }

      existing.rowStart = Math.min(existing.rowStart, row1);
      existing.rowEnd = Math.max(existing.rowEnd, row1);
      existing.colStart = Math.min(existing.colStart, col1);
      existing.colEnd = Math.max(existing.colEnd, col1);
    }
  }

  return result;
};
