import React, { createElement } from "react";
import { renderToString } from "react-dom/server";
import {
  ApplicationStateContext,
  getApplicationStateIdentifier,
  type ApplicationState,
  type ApplicationStateModificationState,
  type ApplicationStateIdentifier,
  type ApplicationStateSetAction,
} from "./ApplicationState";
import {
  useApplicationStateLoader,
  type ApplicationStateLoader,
  type ApplicationStateLoaderConfig,
} from "./ApplicationStateLoader";
import type { ServiceConfig } from "./Service";

const createAbortError = () => {
  const error = new Error("Request was aborted.");
  error.name = "AbortError";
  return error;
};

type LoaderHarness = {
  controller: ApplicationStateLoader;
  getValueState: () => ApplicationState;
  getModifiedState: () => ApplicationStateModificationState;
  onLoadCalls: boolean[];
};

const resolveStateAction = <ValueType,>(
  action: ApplicationStateSetAction<ValueType>,
  previousValue: ValueType,
): ValueType =>
  typeof action === "function"
    ? (action as (value: ValueType) => ValueType)(previousValue)
    : action;

const buildHarness = (config: ApplicationStateLoaderConfig): LoaderHarness => {
  let controller: ApplicationStateLoader | undefined;
  let currentValue: ApplicationState = new Map();
  let currentModified: ApplicationStateModificationState = new Map();
  const onLoadCalls: boolean[] = [];

  const setValue = (newValue: ApplicationStateSetAction<ApplicationState>) => {
    currentValue = resolveStateAction(newValue, currentValue);
  };
  const setModified = (
    newValue: ApplicationStateSetAction<ApplicationStateModificationState>,
  ) => {
    currentModified = resolveStateAction(newValue, currentModified);
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

  const successRequestResult =
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

  const errorRequestResult =
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
    successRequestStatus: successRequestResult.status,
    successRequestValue:
      successRequestResult.status === "success" ? successRequestResult.value : null,
    errorHasValue: errorValueState.has(identifier),
    errorValue: errorValueState.get(identifier) ?? null,
    errorModified: errorModifiedState.get(identifier),
    errorOnLoadCalls: errorHarness.onLoadCalls,
    errorRequestStatus: errorRequestResult.status,
    errorRequestMessage:
      errorRequestResult.status === "error"
        ? (errorRequestResult.error as { message?: string } | undefined)?.message ?? null
        : null,
  };
};

const runApplicationStateLoaderCancellationScenario = async () => {
  const identifier: ApplicationStateIdentifier = { screen: { profile: {} } };
  const serviceConfig: ServiceConfig = {
    protocol: "https",
    domain: "example.com",
  };
  const originalFetch = globalThis.fetch;
  let requestCount = 0;
  let resolveLatestRequest:
    | ((value: Response | PromiseLike<Response>) => void)
    | undefined;

  const harness = buildHarness({
    identifier,
    manual: true,
    cancelPendingOnNewRequest: true,
    remoteProcedureCall: {
      serviceConfig,
      path: "load",
      args: ["base"],
    },
  });

  globalThis.fetch = async (_input, init) => {
    requestCount += 1;
    const requestBody = String(init?.body ?? "");

    return await new Promise<Response>((resolve, reject) => {
      const signal = init?.signal;
      const onAbort = () => reject(createAbortError());

      if (signal?.aborted) {
        onAbort();
        return;
      }

      signal?.addEventListener("abort", onAbort, { once: true });

      if (requestCount === 2) {
        resolveLatestRequest = (value) => {
          signal?.removeEventListener("abort", onAbort);
          resolve(value);
        };
      }

      if (requestBody === "[\"second\"]") {
        return;
      }
    });
  };

  const firstRequest = harness.controller.makeRemoteProcedureCall("first");
  const secondRequest = harness.controller.makeRemoteProcedureCall("second");

  const firstRequestResult = await firstRequest;

  resolveLatestRequest?.({
    ok: true,
    text: async () =>
      JSON.stringify({
        result: "ok",
        args: ["second"],
      }),
  } as Response);

  const secondRequestResult = await secondRequest;

  globalThis.fetch = originalFetch;

  const valueState = harness.getValueState();

  return {
    loading: harness.controller.loading,
    latestError: harness.controller.latestError ?? null,
    value: valueState.get(identifier) ?? null,
    onLoadCalls: harness.onLoadCalls,
    firstRequestStatus: firstRequestResult.status,
    secondRequestStatus: secondRequestResult.status,
  };
};


const runApplicationStateLoaderExplicitCancellationScenario = async () => {
  const identifier: ApplicationStateIdentifier = { screen: { profile: {} } };
  const serviceConfig: ServiceConfig = {
    protocol: "https",
    domain: "example.com",
  };
  const originalFetch = globalThis.fetch;
  let aborted = false;

  const harness = buildHarness({
    identifier,
    manual: true,
    remoteProcedureCall: {
      serviceConfig,
      path: "load",
      args: [],
    },
  });

  globalThis.fetch = async (_input, init) =>
    await new Promise<Response>((_resolve, reject) => {
      const signal = init?.signal;
      const onAbort = () => {
        aborted = true;
        reject(createAbortError());
      };

      if (signal?.aborted) {
        onAbort();
      } else {
        signal?.addEventListener("abort", onAbort, { once: true });
      }
    });

  const request = harness.controller.makeRemoteProcedureCall("pending");
  harness.controller.cancelPendingRequest();
  const requestResult = await request;

  globalThis.fetch = originalFetch;

  return {
    status: requestResult.status,
    aborted,
    hasValue: harness.getValueState().has(identifier),
    onLoadCalls: harness.onLoadCalls,
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

export const runApplicationStateLoaderSuccessRequestStatusScenario = async () =>
  (await runApplicationStateLoaderScenario()).successRequestStatus;

export const runApplicationStateLoaderSuccessRequestValueScenario = async () =>
  (await runApplicationStateLoaderScenario()).successRequestValue;

export const runApplicationStateLoaderErrorHasValueScenario = async () =>
  (await runApplicationStateLoaderScenario()).errorHasValue;

export const runApplicationStateLoaderErrorValueScenario = async () =>
  (await runApplicationStateLoaderScenario()).errorValue;

export const runApplicationStateLoaderErrorModifiedScenario = async () =>
  (await runApplicationStateLoaderScenario()).errorModified;

export const runApplicationStateLoaderErrorOnLoadCallsScenario = async () =>
  (await runApplicationStateLoaderScenario()).errorOnLoadCalls;

export const runApplicationStateLoaderErrorRequestStatusScenario = async () =>
  (await runApplicationStateLoaderScenario()).errorRequestStatus;

export const runApplicationStateLoaderErrorRequestMessageScenario = async () =>
  (await runApplicationStateLoaderScenario()).errorRequestMessage;

export const runApplicationStateLoaderHasValueControllerPropsScenario = () => {
  const identifier = getApplicationStateIdentifier<{ count: number }>();
  const serviceConfig: ServiceConfig = {
    protocol: "https",
    domain: "example.com",
  };
  const harness = buildHarness({
    identifier,
    manual: true,
    remoteProcedureCall: {
      serviceConfig,
      path: "load",
      args: [],
    },
  });

  return (
    "value" in harness.controller &&
    "modified" in harness.controller &&
    "onChange" in harness.controller &&
    "setModified" in harness.controller &&
    "cancelPendingRequest" in harness.controller
  );
};

export const runApplicationStateLoaderLocalFunctionalUpdateScenario = () => {
  const identifier = getApplicationStateIdentifier<{ count: number }>();
  const serviceConfig: ServiceConfig = {
    protocol: "https",
    domain: "example.com",
  };
  const harness = buildHarness({
    identifier,
    manual: true,
    remoteProcedureCall: {
      serviceConfig,
      path: "load",
      args: [],
    },
  });

  harness.controller.onChange((previousValue: { count: number } | undefined) => ({
    count: (previousValue?.count ?? 0) + 1,
  }));
  harness.controller.onChange((previousValue: { count: number } | undefined) => ({
    count: (previousValue?.count ?? 0) + 1,
  }));

  return harness.getValueState().get(identifier);
};

export const runApplicationStateLoaderCancellationLoadingScenario = async () =>
  (await runApplicationStateLoaderCancellationScenario()).loading;

export const runApplicationStateLoaderCancellationLatestErrorScenario = async () =>
  (await runApplicationStateLoaderCancellationScenario()).latestError;

export const runApplicationStateLoaderCancellationValueScenario = async () =>
  (await runApplicationStateLoaderCancellationScenario()).value;

export const runApplicationStateLoaderCancellationOnLoadCallsScenario = async () =>
  (await runApplicationStateLoaderCancellationScenario()).onLoadCalls;

export const runApplicationStateLoaderCancellationFirstRequestStatusScenario = async () =>
  (await runApplicationStateLoaderCancellationScenario()).firstRequestStatus;

export const runApplicationStateLoaderCancellationSecondRequestStatusScenario = async () =>
  (await runApplicationStateLoaderCancellationScenario()).secondRequestStatus;

export const runApplicationStateLoaderExplicitCancellationStatusScenario = async () =>
  (await runApplicationStateLoaderExplicitCancellationScenario()).status;

export const runApplicationStateLoaderExplicitCancellationAbortedScenario = async () =>
  (await runApplicationStateLoaderExplicitCancellationScenario()).aborted;

export const runApplicationStateLoaderExplicitCancellationHasValueScenario = async () =>
  (await runApplicationStateLoaderExplicitCancellationScenario()).hasValue;

export const runApplicationStateLoaderExplicitCancellationOnLoadCallsScenario = async () =>
  (await runApplicationStateLoaderExplicitCancellationScenario()).onLoadCalls;
