import { buildWindowMock } from "./utils/Route.test-utils";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

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

  const App = require("./index");
  appKeys.push(...Object.keys(App));
  const AppUtils = require("./utils");

  const appIndexPath = require.resolve("./index");
  const appUtilsPath = require.resolve("./utils");
  const routeModulePath = require.resolve("./utils/Route");
  delete require.cache[appIndexPath];
  delete require.cache[appUtilsPath];
  delete require.cache[routeModulePath];

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
