import type { TrackSpec } from "./types";

/**
 * Input for converting track specifications into pixels.
 */
export type ComputeTrackPixelsInput = {
  tracks: TrackSpec[];
  totalPx: number;
  gapPx?: number;
  paddingPx?: number;
};

/**
 * Compute pixel sizes for track specs.
 */
export const computeTrackPixels = ({
  tracks,
  totalPx,
  gapPx = 0,
  paddingPx = 0,
}: ComputeTrackPixelsInput): number[] => {
  if (!tracks.length) {
    return [];
  }

  const gapsPx = Math.max(0, tracks.length - 1) * Math.max(0, gapPx);
  const usablePx = Math.max(0, totalPx - Math.max(0, paddingPx) * 2 - gapsPx);

  let fixedPx = 0;
  let frTotal = 0;

  for (const track of tracks) {
    if (track.kind === "px") {
      fixedPx += track.value;
    } else if (track.kind === "pct") {
      fixedPx += (usablePx * track.value) / 100;
    } else {
      frTotal += track.value;
    }
  }

  const remainderPx = Math.max(0, usablePx - fixedPx);

  return tracks.map((track) => {
    if (track.kind === "px") {
      return track.value;
    }

    if (track.kind === "pct") {
      return (usablePx * track.value) / 100;
    }

    if (frTotal <= 0) {
      return 0;
    }

    return (remainderPx * track.value) / frTotal;
  });
};
