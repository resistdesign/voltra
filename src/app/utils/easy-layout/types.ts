/**
 * @packageDocumentation
 *
 * Shared EasyLayout core types.
 */

/**
 * Raw layout template input.
 */
export type EasyLayoutTemplate = string;

/**
 * Supported track units.
 */
export type TrackUnit =
  | { kind: "fr"; value: number }
  | { kind: "px"; value: number }
  | { kind: "pct"; value: number };

/**
 * Track specification for rows/columns.
 */
export type TrackSpec = TrackUnit;

/**
 * Parsed layout representation shared by web/native implementations.
 */
export type EasyLayoutParsed = {
  areaGrid: string[][];
  rowTracks: TrackSpec[];
  colTracks: TrackSpec[];
  areaNames: string[];
};

/**
 * 1-based area bounds in row/column space.
 */
export type AreaBounds = {
  name: string;
  rowStart: number;
  rowEnd: number;
  colStart: number;
  colEnd: number;
};

/**
 * Shared core payload for parsed template + computed bounds.
 */
export type EasyLayoutCore = {
  parsed: EasyLayoutParsed;
  bounds: Record<string, AreaBounds>;
};
