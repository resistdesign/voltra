/**
 * @packageDocumentation
 *
 * Service request helpers for making RPC-style calls with a shared configuration.
 */
import { mergeStringPaths, PATH_DELIMITER } from "../../common/Routing";

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
  authorization?: string;
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
  const portString = !!port ? `:${port}` : "";
  const fullPath = mergeStringPaths(
    basePath,
    path,
    PATH_DELIMITER,
    false,
    false,
    false,
  );

  return `${protocol}://${domain}${portString}${fullPath}`;
};

/**
 * Send a POST request to a service endpoint with JSON arguments.
 *
 * @param config - Service configuration for the request.
 * @param path - Endpoint path to call.
 * @param args - JSON-serializable arguments to send.
 * @returns Parsed JSON response.
 */
export const sendServiceRequest = async (
  config: ServiceConfig,
  path: string = "",
  args: any[] = [],
): Promise<any> => {
  const { protocol, domain, port, basePath = "", authorization = "" } = config;
  const fullUrl = getFullUrl(protocol, domain, basePath, path, port);
  const requestHeaders = !!authorization
    ? {
        Authorization: `Bearer ${authorization}`,
      }
    : undefined;
  const response = await fetch(fullUrl, {
    headers: requestHeaders,
    credentials: "same-origin",
    method: "POST",
    body: JSON.stringify(args),
  });
  const { ok: responseIsOk } = response;
  const data = await response.json();

  if (responseIsOk) {
    return data;
  } else {
    throw data;
  }
};
