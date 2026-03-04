import { getFullUrl, sendServiceRequest, type ServiceConfig } from "./Service";

const runServiceScenario = async () => {
  const config: ServiceConfig = {
    protocol: "https",
    domain: "example.com",
    port: 443,
    basePath: "api",
    authorization: "token-1",
  };
  const url = getFullUrl(
    config.protocol,
    config.domain,
    config.basePath,
    "v1",
    config.port,
  );
  const originUrl = getFullUrl(config.protocol, config.domain, "", "", config.port);
  const normalizedProtocolUrl = getFullUrl(
    "https:",
    "example.com",
    "api",
    "v2",
    443,
  );
  const normalizedDomainUrl = getFullUrl(
    "https",
    "example.com/",
    "api",
    "v3",
    443,
  );
  const slashPrefixedPathUrl = getFullUrl(
    "https",
    "example.com",
    "/api",
    "/method",
    443,
  );
  const trailingSlashBasePathUrl = getFullUrl(
    "https",
    "example.com",
    "/api/",
    "method",
    443,
  );
  const slashBaseAndPathUrl = getFullUrl(
    "https",
    "example.com",
    "/api/",
    "/method",
    443,
  );
  const trailingSlashBaseOnlyUrl = getFullUrl(
    "https",
    "example.com",
    "/api/",
    "",
    443,
  );
  const rootPathWithLeadingSlashUrl = getFullUrl(
    "https",
    "example.com",
    "",
    "/method",
    443,
  );

  const originalFetch = globalThis.fetch;
  let requestInfo: any = {};

  globalThis.fetch = async (input, init) => {
    requestInfo = { input, init };
    const body = JSON.stringify({
      ok: true,
      args: JSON.parse((init?.body as string) ?? "[]"),
    });
    return {
      ok: true,
      text: async () => body,
    } as Response;
  };

  const successResponse = await sendServiceRequest(config, "v1", ["a", 1]);

  globalThis.fetch = async () =>
    ({
      ok: false,
      text: async () => JSON.stringify({ error: "nope" }),
    }) as Response;

  let errorMessage: string | undefined;
  try {
    await sendServiceRequest(config, "v1", ["b"]);
  } catch (error: any) {
    errorMessage = error?.error ?? String(error);
  }

  globalThis.fetch = originalFetch;

  return {
    url,
    originUrl,
    normalizedProtocolUrl,
    normalizedDomainUrl,
    slashPrefixedPathUrl,
    trailingSlashBasePathUrl,
    slashBaseAndPathUrl,
    trailingSlashBaseOnlyUrl,
    rootPathWithLeadingSlashUrl,
    requestInfo: {
      input: requestInfo.input,
      method: requestInfo.init?.method,
      headers: requestInfo.init?.headers,
      body: requestInfo.init?.body,
    },
    successResponse,
    errorMessage,
  };
};

const runServiceTextResponseScenario = async () => {
  const config: ServiceConfig = {
    protocol: "https",
    domain: "example.com",
    port: 443,
    basePath: "api",
  };

  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () =>
    ({
      ok: true,
      text: async () => "Some Response",
    }) as Response;

  const successResponse = await sendServiceRequest(config, "v1", ["a"]);

  globalThis.fetch = async () =>
    ({
      ok: false,
      text: async () => "Unauthorized",
    }) as Response;

  let errorMessage: string | undefined;
  try {
    await sendServiceRequest(config, "v1", ["a"]);
  } catch (error: any) {
    errorMessage = error?.message ?? String(error);
  }

  globalThis.fetch = originalFetch;

  return {
    successResponse,
    errorMessage,
  };
};

export const runServiceUrlScenario = async () => (await runServiceScenario()).url;

export const runServiceOriginUrlScenario = async () =>
  (await runServiceScenario()).originUrl;

export const runServiceNormalizedProtocolUrlScenario = async () =>
  (await runServiceScenario()).normalizedProtocolUrl;

export const runServiceNormalizedDomainUrlScenario = async () =>
  (await runServiceScenario()).normalizedDomainUrl;

export const runServiceSlashPrefixedPathUrlScenario = async () =>
  (await runServiceScenario()).slashPrefixedPathUrl;

export const runServiceTrailingSlashBasePathUrlScenario = async () =>
  (await runServiceScenario()).trailingSlashBasePathUrl;

export const runServiceSlashBaseAndPathUrlScenario = async () =>
  (await runServiceScenario()).slashBaseAndPathUrl;

export const runServiceTrailingSlashBaseOnlyUrlScenario = async () =>
  (await runServiceScenario()).trailingSlashBaseOnlyUrl;

export const runServiceRootPathWithLeadingSlashUrlScenario = async () =>
  (await runServiceScenario()).rootPathWithLeadingSlashUrl;

export const runServiceRequestInfoScenario = async () =>
  (await runServiceScenario()).requestInfo;

export const runServiceSuccessResponseScenario = async () =>
  (await runServiceScenario()).successResponse;

export const runServiceErrorMessageScenario = async () =>
  (await runServiceScenario()).errorMessage;

export const runServiceTextSuccessResponseScenario = async () =>
  (await runServiceTextResponseScenario()).successResponse;

export const runServiceTextErrorMessageScenario = async () =>
  (await runServiceTextResponseScenario()).errorMessage;
