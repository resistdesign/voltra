import { computeAreaBounds } from "./computeAreaBounds";
import { parseTemplate } from "./parseTemplate";
import { validateAreas } from "./validateAreas";

export const runComputeAreaBoundsRectangle = () => {
  const parsed = parseTemplate(`
    header header, 1fr
    side main, 1fr
    side footer, 1fr
    \\ 1fr 2fr
  `);

  return computeAreaBounds(parsed);
};

export const runValidateAreasNonRectangle = () => {
  try {
    const parsed = parseTemplate(`
      a a, 1fr
      a b, 1fr
      \\ 1fr 1fr
    `);
    validateAreas(parsed);
    return { ok: true, message: "" };
  } catch (err) {
    return { ok: false, message: (err as Error).message };
  }
};
