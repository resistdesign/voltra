/**
 * @packageDocumentation
 *
 * Service request helpers for making RPC-style calls with a shared configuration.
 */
import { mergeStringPaths, PATH_DELIMITER } from "../../common/Routing";

const activeRequestControllers = new Map<string, AbortController>();

/**
 * The HTTP service configuration, including authorization, to be used for a service call.
 * */
export type ServiceConfig = {
  /**
   * URL protocol (http or https).
   * */
  protocol: string;
  /**
   * Service domain or host.
   * */
  domain: string;
  /**
   * Optional port override.
   * */
  port?: number;
  /**
   * Base path to prefix all request paths.
   * */
  basePath?: string;
  /**
   * Bearer token for authorization.
   * */
  authorization?:
    | string
    | {
        value: string;
      };
};

/**
 * Additional request behavior for a service call.
 * */
export type ServiceRequestConfig = {
  /**
   * Abort the prior in-flight request for the same service URL before starting a new one.
   *
   * @default false
   * */
  cancelPendingOnNewRequest?: boolean;
};

/**
 * Build the full URL for a service call from config pieces.
 *
 * @param protocol - URL protocol (http or https).
 * @param domain - Service domain or host.
 * @param basePath - Base path to prefix all requests.
 * @param path - Endpoint path to append.
 * @param port - Optional port override.
 * @returns Fully qualified URL string.
 */
export const getFullUrl = (
  protocol: string,
  domain: string,
  basePath: string = "",
  path: string = "",
  port?: number,
): string => {
  const normalizedProtocol = protocol.endsWith(":")
    ? protocol.slice(0, -1)
    : protocol;
  const normalizedDomain = domain.replace(/\/+$/, "");
  const portString = !!port ? `:${port}` : "";
  const fullPath = mergeStringPaths(
    basePath,
    path,
    PATH_DELIMITER,
    false,
    true,
    false,
  );
  const normalizedPath = fullPath
    ? fullPath.startsWith(PATH_DELIMITER)
      ? fullPath
      : `${PATH_DELIMITER}${fullPath}`
    : PATH_DELIMITER;

  return `${normalizedProtocol}://${normalizedDomain}${portString}${normalizedPath}`;
};

/**
 * Send a POST request to a service endpoint with JSON arguments.
 *
 * @param config - Service configuration for the request.
 * @param path - Endpoint path to call.
 * @param args - JSON-serializable arguments to send.
 * @param requestConfig - Additional request behavior configuration.
 * @returns Parsed JSON response.
 */
export const sendServiceRequest = async (
  config: ServiceConfig,
  path: string = "",
  args: any[] = [],
  requestConfig: ServiceRequestConfig = {},
): Promise<any> => {
  const { protocol, domain, port, basePath = "", authorization = "" } = config;
  const { cancelPendingOnNewRequest = false } = requestConfig;
  const fullUrl = getFullUrl(protocol, domain, basePath, path, port);
  const abortController = new AbortController();
  const previousRequestController = activeRequestControllers.get(fullUrl);

  if (cancelPendingOnNewRequest) {
    previousRequestController?.abort();
    activeRequestControllers.set(fullUrl, abortController);
  }

  const requestHeaders = {
    "Content-Type": "application/json",
    ...(!!authorization
      ? {
          Authorization: `Bearer ${
            typeof authorization === "object"
              ? authorization.value
              : authorization
          }`,
        }
      : {}),
  };
  try {
    const response = await fetch(fullUrl, {
      headers: requestHeaders,
      credentials: "same-origin",
      method: "POST",
      body: JSON.stringify(args),
      signal: abortController.signal,
    });
    const { ok: responseIsOk } = response;
    const textData = await response.text();

    let data: any;

    try {
      data = JSON.parse(textData);
    } catch (error) {
      data = undefined;
    }

    if (responseIsOk) {
      return data;
    } else {
      throw data;
    }
  } finally {
    if (cancelPendingOnNewRequest) {
      const activeRequestController = activeRequestControllers.get(fullUrl);

      if (activeRequestController === abortController) {
        activeRequestControllers.delete(fullUrl);
      }
    }
  }
};
