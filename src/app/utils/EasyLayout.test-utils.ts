import { getEasyLayoutTemplateDetails, getPascalCaseAreaName } from "./EasyLayout";

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
