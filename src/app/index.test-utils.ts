import { buildWindowMock } from "../web/utils/Route.test-utils";

const loadAppModule = async (specifier: string) => {
  const moduleUrl = new URL(specifier, import.meta.url);
  moduleUrl.search = `?t=${Date.now()}`;
  return import(moduleUrl.href);
};

export const runAppIndexScenario = async () => {
  const originalWindow = (globalThis as any).window;
  const originalCustomEvent = (globalThis as any).CustomEvent;
  const { windowMock } = buildWindowMock("/app");
  (globalThis as any).window = windowMock;
  (globalThis as any).CustomEvent = class CustomEvent {
    type: string;
    detail: any;

    constructor(type: string, init: { detail?: any }) {
      this.type = type;
      this.detail = init.detail;
    }
  };

  const App = await loadAppModule("./index.ts");
  const AppUtils = await loadAppModule("./utils/index.ts");

  (globalThis as any).window = originalWindow;
  (globalThis as any).CustomEvent = originalCustomEvent;

  return {
    hasUtilsNamespace: "Utils" in App,
    hasFormsNamespace: "Forms" in App,
    hasParseTemplateTopLevel: "parseTemplate" in App,
    hasComputeTrackPixelsTopLevel: "computeTrackPixels" in App,
    hasCreateFormRendererTopLevel: "createFormRenderer" in App,
    hasUseApplicationStateLoaderTopLevel: "useApplicationStateLoader" in App,
    hasUseController: "useController" in AppUtils,
    hasTypeInfoORMClient: "TypeInfoORMClient" in AppUtils,
    hasRoute: "Route" in AppUtils,
    hasApplicationState: "ApplicationStateContext" in AppUtils,
    hasApplicationStateLoader: "useApplicationStateLoader" in AppUtils,
    hasService: "sendServiceRequest" in AppUtils,
    hasTypeInfoORMAPI: "useTypeInfoORMAPI" in AppUtils,
  };
};
