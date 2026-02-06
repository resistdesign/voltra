import { parseTemplate } from "./parseTemplate";

export const runParseTemplateHappyPath = () => {
  const parsed = parseTemplate(`
    header header, 1fr
    side main, 2fr
    \\ 100px 1fr
  `);

  return parsed;
};

export const runParseTemplateInconsistentWidths = () => {
  try {
    parseTemplate(`
      header header, 1fr
      side main extra, 2fr
      \\ 100px 1fr 1fr
    `);
    return { ok: true, message: "" };
  } catch (err) {
    return { ok: false, message: (err as Error).message };
  }
};

export const runParseTemplateUnknownTrack = () => {
  try {
    parseTemplate(`
      header main, 1foo
      \\ 1fr 1fr
    `);
    return { ok: true, message: "" };
  } catch (err) {
    return { ok: false, message: (err as Error).message };
  }
};

export const runParseTemplateMissingRowTracks = () => {
  return parseTemplate(`
    header header
    side main
    \\ 1fr 1fr
  `);
};
