import React, { createElement } from "react";
import { renderToString } from "react-dom/server";
import {
  ApplicationStateContext,
  type ApplicationState,
  type ApplicationStateModificationState,
  type ApplicationStateIdentifier,
} from "./ApplicationState";
import {
  useApplicationStateLoader,
  type ApplicationStateLoader,
  type ApplicationStateLoaderConfig,
} from "./ApplicationStateLoader";
import type { ServiceConfig } from "./Service";

type LoaderHarness = {
  controller: ApplicationStateLoader;
  getValueState: () => ApplicationState;
  getModifiedState: () => ApplicationStateModificationState;
  onLoadCalls: boolean[];
};

const buildHarness = (config: ApplicationStateLoaderConfig): LoaderHarness => {
  let controller: ApplicationStateLoader | undefined;
  let currentValue: ApplicationState = new Map();
  let currentModified: ApplicationStateModificationState = new Map();
  const onLoadCalls: boolean[] = [];

  const setValue = (newValue: ApplicationState) => {
    currentValue = newValue;
  };
  const setModified = (newValue: ApplicationStateModificationState) => {
    currentModified = newValue;
  };

  const Component = () => {
    controller = useApplicationStateLoader({
      ...config,
      onLoadComplete: (success) => {
        onLoadCalls.push(success);
      },
    });
    return null;
  };

  renderToString(
    createElement(
      ApplicationStateContext.Provider,
      {
        value: {
          value: currentValue,
          modified: currentModified,
          onChange: setValue,
          setModified,
        },
      },
      createElement(Component),
    ),
  );

  if (!controller) {
    throw new Error("Failed to initialize ApplicationStateLoader.");
  }

  return {
    controller,
    getValueState: () => currentValue,
    getModifiedState: () => currentModified,
    onLoadCalls,
  };
};

const runApplicationStateLoaderScenario = async () => {
  const identifier: ApplicationStateIdentifier = { screen: { profile: {} } };
  const serviceConfig: ServiceConfig = {
    protocol: "https",
    domain: "example.com",
  };

  const originalFetch = globalThis.fetch;

  const successHarness = buildHarness({
    identifier,
    manual: true,
    remoteProcedureCall: {
      serviceConfig,
      path: "load",
      args: ["base"],
    },
  });

  globalThis.fetch = async (_input, init) => {
    const body = JSON.stringify({
      result: "ok",
      args: JSON.parse((init?.body as string) ?? "[]"),
    });

    return {
      ok: true,
      text: async () => body,
    } as Response;
  };

  await successHarness.controller.makeRemoteProcedureCall("direct");

  const successValueState = successHarness.getValueState();
  const successModifiedState = successHarness.getModifiedState();

  const errorHarness = buildHarness({
    identifier,
    manual: true,
    resetOnError: true,
    remoteProcedureCall: {
      serviceConfig,
      path: "load",
      args: ["base"],
    },
  });

  globalThis.fetch = async () =>
    ({
      ok: false,
      text: async () => JSON.stringify({ message: "nope" }),
    }) as Response;

  await errorHarness.controller.makeRemoteProcedureCall("direct");

  const errorValueState = errorHarness.getValueState();
  const errorModifiedState = errorHarness.getModifiedState();

  globalThis.fetch = originalFetch;

  return {
    initialLoading: successHarness.controller.loading,
    initialLatestError: successHarness.controller.latestError ?? null,
    successHasValue: successValueState.has(identifier),
    successValue: successValueState.get(identifier),
    successModified: successModifiedState.get(identifier),
    successOnLoadCalls: successHarness.onLoadCalls,
    errorHasValue: errorValueState.has(identifier),
    errorValue: errorValueState.get(identifier) ?? null,
    errorModified: errorModifiedState.get(identifier),
    errorOnLoadCalls: errorHarness.onLoadCalls,
  };
};

export const runApplicationStateLoaderInitialLoadingScenario = async () =>
  (await runApplicationStateLoaderScenario()).initialLoading;

export const runApplicationStateLoaderInitialLatestErrorScenario = async () =>
  (await runApplicationStateLoaderScenario()).initialLatestError;

export const runApplicationStateLoaderSuccessHasValueScenario = async () =>
  (await runApplicationStateLoaderScenario()).successHasValue;

export const runApplicationStateLoaderSuccessValueScenario = async () =>
  (await runApplicationStateLoaderScenario()).successValue;

export const runApplicationStateLoaderSuccessModifiedScenario = async () =>
  (await runApplicationStateLoaderScenario()).successModified;

export const runApplicationStateLoaderSuccessOnLoadCallsScenario = async () =>
  (await runApplicationStateLoaderScenario()).successOnLoadCalls;

export const runApplicationStateLoaderErrorHasValueScenario = async () =>
  (await runApplicationStateLoaderScenario()).errorHasValue;

export const runApplicationStateLoaderErrorValueScenario = async () =>
  (await runApplicationStateLoaderScenario()).errorValue;

export const runApplicationStateLoaderErrorModifiedScenario = async () =>
  (await runApplicationStateLoaderScenario()).errorModified;

export const runApplicationStateLoaderErrorOnLoadCallsScenario = async () =>
  (await runApplicationStateLoaderScenario()).errorOnLoadCalls;
