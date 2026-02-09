import type {
  EasyLayoutParsed,
  EasyLayoutTemplate,
  TrackSpec,
} from "./types";

const parseTrackSpec = (token: string): TrackSpec => {
  const trimmed = token.trim();
  const numericMatch = trimmed.match(/^([0-9]*\.?[0-9]+)(fr|px|%)$/);

  if (!numericMatch) {
    throw new Error(
      `Invalid track token "${trimmed}". Supported units are fr, px, and %.`,
    );
  }

  const value = Number(numericMatch[1]);
  const suffix = numericMatch[2];

  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`Track value must be a non-negative number. Received "${trimmed}".`);
  }

  if (suffix === "fr") {
    return { kind: "fr", value };
  }

  if (suffix === "px") {
    return { kind: "px", value };
  }

  return { kind: "pct", value };
};

const normalizeAreas = (areaPart: string): string[] => {
  return areaPart
    .trim()
    .split(/\s+/g)
    .map((token) => token.trim())
    .filter(Boolean);
};

/**
 * Parse an EasyLayout template into rows, tracks, and area names.
 *
 * @category EasyLayout
 *
 * Supported syntax:
 * - row lines: `<area area ...>, <row-track>`
 * - column line: `\\ <col-track> <col-track> ...`
 * - row track is optional for parity with current behavior.
 */
export const parseTemplate = (template: EasyLayoutTemplate = ""): EasyLayoutParsed => {
  const lines = template
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const areaGrid: string[][] = [];
  const rowTracks: TrackSpec[] = [];
  let colTracks: TrackSpec[] | null = null;

  for (const line of lines) {
    if (line.startsWith("\\")) {
      if (colTracks) {
        throw new Error("Template can include only one column-track line.");
      }

      const colTokens = line
        .replace(/\\/g, " ")
        .trim()
        .split(/\s+/g)
        .filter(Boolean);

      colTracks = colTokens.map(parseTrackSpec);
      continue;
    }

    const parts = line.split(",").map((part) => part.trim());
    const areaPart = parts[0] || "";

    if (!areaPart) {
      continue;
    }

    if (parts.length > 2) {
      throw new Error(
        `Invalid row definition "${line}". Expected "<areas>, <row-track>".`,
      );
    }

    const areas = normalizeAreas(areaPart);
    if (!areas.length) {
      continue;
    }

    areaGrid.push(areas);

    const rowTrack = parts[1];
    if (rowTrack) {
      rowTracks.push(parseTrackSpec(rowTrack));
    }
  }

  if (!areaGrid.length) {
    throw new Error("Template must include at least one area row.");
  }

  const expectedWidth = areaGrid[0].length;
  for (let rowIndex = 0; rowIndex < areaGrid.length; rowIndex++) {
    const width = areaGrid[rowIndex].length;
    if (width !== expectedWidth) {
      throw new Error(
        `All area rows must have the same width. Expected ${expectedWidth}, received ${width} at row ${rowIndex + 1}.`,
      );
    }
  }

  if (colTracks && colTracks.length !== expectedWidth) {
    throw new Error(
      `Column track count must match area width. Expected ${expectedWidth}, received ${colTracks.length}.`,
    );
  }

  const areaNames = Array.from(
    new Set(
      areaGrid
        .flat()
        .map((name) => name.trim())
        .filter((name) => !!name && name !== "."),
    ),
  );

  return {
    areaGrid,
    rowTracks,
    colTracks: colTracks || [],
    areaNames,
  };
};
