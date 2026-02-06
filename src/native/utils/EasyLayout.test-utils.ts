import { makeNativeEasyLayout } from "./EasyLayout";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { NativeEasyLayoutView } from "./EasyLayout";

export const runNativeEasyLayoutRepresentativeScenario = () => {
  const layout = makeNativeEasyLayout(`
    header header, 100px
    side main, 1fr
    \\ 1fr 2fr
  `);

  return layout.computeNativeCoords({
    width: 300,
    height: 240,
    padding: 10,
    gap: 8,
  });
};

export const runNativeEasyLayoutMixedTrackScenario = () => {
  const layout = makeNativeEasyLayout(`
    a b c, 1fr
    \\ 100px 25% 1fr
  `);

  return layout.computeNativeCoords({
    width: 500,
    height: 100,
    padding: 0,
    gap: 10,
  });
};

export const runNativeEasyLayoutInvalidTemplateScenario = () => {
  try {
    makeNativeEasyLayout(`
      a a, 1fr
      a b, 1fr
      \\ 1fr 1fr
    `);
    return { ok: true, message: "" };
  } catch (err) {
    return { ok: false, message: (err as Error).message };
  }
};

export const runNativeEasyLayoutStabilityScenario = () => {
  const layout = makeNativeEasyLayout(`
    nav main, 1fr
    \\ 1fr 3fr
  `);

  const input = {
    width: 800,
    height: 400,
    padding: 20,
    gap: 10,
    roundToDecimals: 3,
  };

  const first = layout.computeNativeCoords(input);
  const second = layout.computeNativeCoords(input);

  return {
    stable: JSON.stringify(first) === JSON.stringify(second),
    first,
    second,
  };
};

export const runNativeEasyLayoutViewScenario = () => {
  const layout = makeNativeEasyLayout(`
    header main, 1fr
    \\ 1fr 2fr
  `);

  const html = renderToString(
    createElement(NativeEasyLayoutView, {
      layout,
      width: 300,
      height: 120,
      gap: 10,
      padding: 10,
      areaChildren: {
        header: createElement("span", null, "Header"),
        main: createElement("span", null, "Main"),
      },
    }),
  );

  return {
    hasHeader: html.includes("Header"),
    hasMain: html.includes("Main"),
    hasAbsolute: html.includes("position:absolute"),
    hasRelative: html.includes("position:relative"),
  };
};
