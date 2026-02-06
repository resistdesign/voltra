import { computeAreaBounds } from "./computeAreaBounds";
import type { EasyLayoutParsed } from "./types";

/**
 * Validate that each named area in the parsed grid is a rectangle.
 */
export const validateAreas = (parsed: EasyLayoutParsed): void => {
  const bounds = computeAreaBounds(parsed);

  for (const areaName of parsed.areaNames) {
    const bound = bounds[areaName];
    if (!bound) {
      continue;
    }

    for (let row = bound.rowStart; row <= bound.rowEnd; row++) {
      for (let col = bound.colStart; col <= bound.colEnd; col++) {
        const token = parsed.areaGrid[row - 1]?.[col - 1];
        if (token !== areaName) {
          throw new Error(
            `Area "${areaName}" must be a rectangle. Missing "${areaName}" at row ${row}, col ${col}.`,
          );
        }
      }
    }
  }
};
