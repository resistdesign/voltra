import { buildWindowMock } from "./utils/Route.test-utils";

const loadAppModule = async (specifier: string) => {
  const moduleUrl = new URL(specifier, import.meta.url);
  moduleUrl.search = `?t=${Date.now()}`;
  return import(moduleUrl.href);
};

export const runAppIndexScenario = async () => {
  const appKeys: string[] = [];
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
  appKeys.push(...Object.keys(App));
  const AppUtils = await loadAppModule("./utils/index.ts");

  (globalThis as any).window = originalWindow;
  (globalThis as any).CustomEvent = originalCustomEvent;

  return {
    appKeys,
    hasUtilsNamespace: "Utils" in App,
    hasUseController: "useController" in AppUtils,
    hasTypeInfoORMClient: "TypeInfoORMClient" in AppUtils,
    hasRoute: "Route" in AppUtils,
    hasApplicationState: "ApplicationStateContext" in AppUtils,
    hasApplicationStateLoader: "useApplicationStateLoader" in AppUtils,
    hasService: "sendServiceRequest" in AppUtils,
    hasTypeInfoORMAPI: "useTypeInfoORMAPI" in AppUtils,
  };
};
