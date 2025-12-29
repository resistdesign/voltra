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
  protocol: string;
  domain: string;
  port?: number;
  basePath?: string;
  authorization?: string;
};

/**
 * Build the full URL for a service call from config pieces.
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
