import { computeTrackPixels } from "./computeTracks";
import type { TrackSpec } from "./types";

export const runComputeTrackPixelsMixedUnits = () => {
  const tracks: TrackSpec[] = [
    { kind: "px", value: 50 },
    { kind: "pct", value: 25 },
    { kind: "fr", value: 1 },
    { kind: "fr", value: 3 },
  ];

  return computeTrackPixels({
    tracks,
    totalPx: 500,
    gapPx: 10,
    paddingPx: 20,
  });
};

export const runComputeTrackPixelsRemainderDistribution = () => {
  const tracks: TrackSpec[] = [
    { kind: "fr", value: 1 },
    { kind: "fr", value: 2 },
  ];

  return computeTrackPixels({
    tracks,
    totalPx: 300,
    gapPx: 0,
    paddingPx: 0,
  });
};

export const runComputeTrackPixelsSmallContainer = () => {
  const tracks: TrackSpec[] = [
    { kind: "px", value: 200 },
    { kind: "fr", value: 1 },
  ];

  return computeTrackPixels({
    tracks,
    totalPx: 100,
    gapPx: 0,
    paddingPx: 0,
  });
};
