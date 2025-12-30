import { getFullUrl, sendServiceRequest, type ServiceConfig } from "./Service";

export const runServiceScenario = async () => {
  const config: ServiceConfig = {
    protocol: "https",
    domain: "example.com",
    port: 443,
    basePath: "api",
    authorization: "token-1",
  };
  const url = getFullUrl(config.protocol, config.domain, config.basePath, "v1", config.port);

  const originalFetch = globalThis.fetch;
  let requestInfo: any = {};

  globalThis.fetch = async (input, init) => {
    requestInfo = { input, init };
    return {
      ok: true,
      json: async () => ({ ok: true, args: JSON.parse((init?.body as string) ?? "[]") }),
    } as Response;
  };

  const successResponse = await sendServiceRequest(config, "v1", ["a", 1]);

  globalThis.fetch = async () =>
    ({
      ok: false,
      json: async () => ({ error: "nope" }),
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
