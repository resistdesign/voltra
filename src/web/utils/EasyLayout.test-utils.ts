import {
  getEasyLayoutTemplateDetails,
  getPascalCaseAreaName,
} from "../../app/utils/EasyLayout";

export const runEasyLayoutScenario = () => {
  const layout = `
    header header, 1fr
    side main, 2fr
    \\ 100px 1fr
  `;

  const details = getEasyLayoutTemplateDetails(layout);

  return {
    areasList: details.areasList,
    css: details.css.trim(),
    pascalCaseHeader: getPascalCaseAreaName("header"),
    pascalCaseMainContent: getPascalCaseAreaName("main-content"),
  };
};

export const runEasyLayoutRowsOptionalScenario = () => {
  const layout = `
    header header
    side main
    \\ 1fr 2fr
  `;

  const details = getEasyLayoutTemplateDetails(layout);

  return {
    areasList: details.areasList,
    css: details.css.trim(),
  };
};

export const runEasyLayoutInvalidShapeScenario = () => {
  try {
    getEasyLayoutTemplateDetails(`
      a a, 1fr
      a b, 1fr
      \\ 1fr 1fr
    `);
    return { ok: true, message: "" };
  } catch (err) {
    return { ok: false, message: (err as Error).message };
  }
};

export const runEasyLayoutSpacingScenario = () => {
  const details = getEasyLayoutTemplateDetails(
    `
      header header, 1fr
      side main, 2fr
      \\ 1fr 2fr
    `,
    {
      gap: 12,
      padding: "1rem",
    },
  );

  return {
    areasList: details.areasList,
    css: details.css.trim(),
  };
};
