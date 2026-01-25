import { handleCloudFunctionEvent } from "../Router";
import { AWS } from "../Router/AWS";
import { mergeStringPaths } from "../../common/Routing";
import type { CloudFunctionResponse } from "../Router/Types";
import type { DBXRequestInput, DBXResponse, DBXRuntime } from "./DBXTypes";

const DEFAULT_ORIGIN = "https://dbx.local";

const safeParseJSON = (body: string): any => {
  try {
    return JSON.parse(body);
  } catch (_error) {
    return undefined;
  }
};

const buildEvent = (runtime: DBXRuntime, request: DBXRequestInput) => {
  const auth = request.auth ?? { userId: "dbx-user" };
  const origin = request.origin ?? DEFAULT_ORIGIN;
  const path = mergeStringPaths(runtime.basePath, request.path);
  const payload = request.args ?? request.body ?? [];

  return {
    httpMethod: request.method,
    path,
    body: JSON.stringify(payload),
    headers: {
      Origin: origin,
      ...(request.headers ?? {}),
    },
    multiValueHeaders: {},
    requestContext: {
      authorizer: {
        claims: {
          sub: auth.userId,
          "cognito:groups": auth.roles ?? [],
        },
      },
    },
  };
};

/**
 * Run a DBX request through the router.
 */
export const runDbxRequest = async <T = unknown>(
  runtime: DBXRuntime,
  request: DBXRequestInput,
): Promise<DBXResponse<T>> => {
  const event = buildEvent(runtime, request);
  const response: CloudFunctionResponse = await handleCloudFunctionEvent(
    event,
    AWS.normalizeCloudFunctionEvent,
    runtime.routeMap,
    runtime.allowedOrigins,
    runtime.errorShouldBeExposedToClient,
  );

  return {
    statusCode: response.statusCode,
    headers: response.headers,
    body: response.body,
    parsedBody: safeParseJSON(response.body) as T | undefined,
  };
};
