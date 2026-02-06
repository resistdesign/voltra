/**
 * @packageDocumentation
 *
 * Native EasyLayout computes absolute coordinates from a template + container size.
 *
 * Differences from web:
 * - Native does not use CSS Grid.
 * - Coordinates are computed from explicit container width/height.
 * - Recompute whenever container size changes.
 * - `auto` track sizing is not supported.
 */
import type { ComponentType, CSSProperties, ReactNode } from "react";
import { createElement, useMemo } from "react";
import { computeAreaBounds } from "../../app/utils/easy-layout/computeAreaBounds";
import { computeTrackPixels } from "../../app/utils/easy-layout/computeTracks";
import { parseTemplate } from "../../app/utils/easy-layout/parseTemplate";
import type {
  AreaBounds,
  EasyLayoutParsed,
  EasyLayoutTemplate,
} from "../../app/utils/easy-layout/types";
import { validateAreas } from "../../app/utils/easy-layout/validateAreas";

/**
 * Native EasyLayout options.
 */
export type NativeEasyLayoutOptions = {
  /**
   * Uniform container padding in pixels.
   */
  padding?: number;
  /**
   * Uniform gap between row/column tracks in pixels.
   */
  gap?: number;
  /**
   * Coordinate rounding precision. Defaults to 3 decimals.
   */
  roundToDecimals?: number;
};

/**
 * Absolute coordinates for each named area.
 */
export type NativeEasyLayoutCoords = Record<
  string,
  { left: number; top: number; width: number; height: number }
>;

/**
 * Input for native coordinate computation.
 */
export type NativeEasyLayoutComputeInput = NativeEasyLayoutOptions & {
  width: number;
  height: number;
};

/**
 * Native EasyLayout instance created from a template.
 */
export type NativeEasyLayout = {
  template: EasyLayoutTemplate;
  parsed: EasyLayoutParsed;
  bounds: Record<string, AreaBounds>;
  areaNames: string[];
  /**
   * Compute area coordinates for a measured container.
   */
  computeNativeCoords: (input: NativeEasyLayoutComputeInput) => NativeEasyLayoutCoords;
};

/**
 * Optional rendering helper props for coordinate-based layout.
 *
 * Pass a native `View` component via `ViewComponent` in React Native apps.
 */
export type NativeEasyLayoutViewProps = NativeEasyLayoutComputeInput & {
  layout: NativeEasyLayout;
  areaChildren?: Record<string, ReactNode>;
  ViewComponent?: ComponentType<any>;
  containerStyle?: Record<string, any>;
  areaStyle?: Record<string, any>;
  onLayout?: (...args: any[]) => void;
};

const roundTo = (value: number, decimals: number): number => {
  const places = Number.isFinite(decimals) ? Math.max(0, decimals) : 3;
  const factor = Math.pow(10, places);
  return Math.round(value * factor) / factor;
};

const sumTrackWindow = (
  tracks: number[],
  startIndex: number,
  endIndex: number,
  gapPx: number,
): number => {
  if (endIndex < startIndex) {
    return 0;
  }

  const trackSum = tracks
    .slice(startIndex, endIndex + 1)
    .reduce((acc, value) => acc + value, 0);
  const gaps = (endIndex - startIndex) * gapPx;
  return trackSum + Math.max(0, gaps);
};

const sumBeforeTrack = (tracks: number[], startIndex: number, gapPx: number): number => {
  if (startIndex <= 0) {
    return 0;
  }

  const trackSum = tracks.slice(0, startIndex).reduce((acc, value) => acc + value, 0);
  const gaps = startIndex * Math.max(0, gapPx);
  return trackSum + gaps;
};

const computeCoords = (
  parsed: EasyLayoutParsed,
  bounds: Record<string, AreaBounds>,
  { width, height, padding = 0, gap = 0, roundToDecimals = 3 }: NativeEasyLayoutComputeInput,
): NativeEasyLayoutCoords => {
  const rowTracks = parsed.rowTracks.length
    ? parsed.rowTracks
    : parsed.areaGrid.map(() => ({ kind: "fr" as const, value: 1 }));

  const colTracks = parsed.colTracks.length
    ? parsed.colTracks
    : parsed.areaGrid[0].map(() => ({ kind: "fr" as const, value: 1 }));

  const rowPixels = computeTrackPixels({
    tracks: rowTracks,
    totalPx: Math.max(0, height),
    gapPx: gap,
    paddingPx: padding,
  });
  const colPixels = computeTrackPixels({
    tracks: colTracks,
    totalPx: Math.max(0, width),
    gapPx: gap,
    paddingPx: padding,
  });

  const result: NativeEasyLayoutCoords = {};
  for (const areaName of parsed.areaNames) {
    const area = bounds[areaName];
    if (!area) {
      continue;
    }

    const left =
      Math.max(0, padding) +
      sumBeforeTrack(colPixels, area.colStart - 1, Math.max(0, gap));
    const top =
      Math.max(0, padding) +
      sumBeforeTrack(rowPixels, area.rowStart - 1, Math.max(0, gap));
    const areaWidth = sumTrackWindow(
      colPixels,
      area.colStart - 1,
      area.colEnd - 1,
      Math.max(0, gap),
    );
    const areaHeight = sumTrackWindow(
      rowPixels,
      area.rowStart - 1,
      area.rowEnd - 1,
      Math.max(0, gap),
    );

    result[areaName] = {
      left: roundTo(left, roundToDecimals),
      top: roundTo(top, roundToDecimals),
      width: roundTo(areaWidth, roundToDecimals),
      height: roundTo(areaHeight, roundToDecimals),
    };
  }

  return result;
};

/**
 * Create a native EasyLayout instance from a template.
 */
export const makeNativeEasyLayout = (
  template: EasyLayoutTemplate,
): NativeEasyLayout => {
  const parsed = parseTemplate(template);
  validateAreas(parsed);
  const bounds = computeAreaBounds(parsed);

  return {
    template,
    parsed,
    bounds,
    areaNames: parsed.areaNames,
    computeNativeCoords: (input) => computeCoords(parsed, bounds, input),
  };
};

/**
 * Hook wrapper for native coordinate computation.
 *
 * Recomputes when size/options change.
 */
export const useNativeEasyLayout = (
  layout: NativeEasyLayout,
  input: NativeEasyLayoutComputeInput,
): NativeEasyLayoutCoords => {
  return useMemo(
    () => layout.computeNativeCoords(input),
    [
      layout,
      input.width,
      input.height,
      input.padding,
      input.gap,
      input.roundToDecimals,
    ],
  );
};

/**
 * Optional render helper that maps named areas to absolutely positioned children.
 */
export const NativeEasyLayoutView = ({
  layout,
  areaChildren = {},
  ViewComponent,
  containerStyle = {},
  areaStyle = {},
  onLayout,
  ...input
}: NativeEasyLayoutViewProps) => {
  const coords = useNativeEasyLayout(layout, input);
  const Container: ComponentType<any> | string = ViewComponent || "div";

  return createElement(
    Container,
    {
      onLayout,
      style: {
        position: "relative",
        width: input.width,
        height: input.height,
        ...containerStyle,
      } as CSSProperties,
    },
    layout.areaNames.map((areaName) =>
      createElement(
        Container,
        {
          key: areaName,
          style: {
            position: "absolute",
            ...coords[areaName],
            ...areaStyle,
          } as CSSProperties,
        },
        areaChildren[areaName] ?? null,
      ),
    ),
  );
};
