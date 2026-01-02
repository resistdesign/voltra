import { AWS, handleCloudFunctionEvent } from "../../src/api/Router";
import { type CloudFunctionResponse } from "../../src/api/Router/Types";
import {
  ERROR_MESSAGE_CONSTANTS,
  PRIMITIVE_ERROR_MESSAGE_CONSTANTS,
} from "../../src/common/TypeParsing/Validation";
import { TypeInfoORMServiceError } from "../../src/common/TypeInfoORM";
import { ROUTE_MAP_WITH_DB } from "./routeMap";

const allowedErrors = new Set<string>([
  ...Object.values(PRIMITIVE_ERROR_MESSAGE_CONSTANTS),
  ...Object.values(ERROR_MESSAGE_CONSTANTS),
  ...Object.values(TypeInfoORMServiceError),
]);

/**
 * Filters errors to determine whether they are safe to return to clients.
 */
const allowClientError = (error: unknown): boolean => {

  const errorCode = (() => {
    if (typeof error === "string") {
      return error;
    }

    if (error && typeof error === "object") {
      if ("error" in error && typeof (error as any).error === "string") {
        return (error as any).error as string;
      }

      if ("message" in error && typeof (error as any).message === "string") {
        return (error as any).message as string;
      }
    }

    return undefined;
  })();

  return typeof errorCode === "string" && allowedErrors.has(errorCode);
};

/**
 * Cloud function entrypoint that delegates to the shared router and route map.
 */
export const handler = async (event: any): Promise<CloudFunctionResponse> =>
  handleCloudFunctionEvent(
    event,
    AWS.normalizeCloudFunctionEvent,
    ROUTE_MAP_WITH_DB,
    [
      process.env.CLIENT_ORIGIN as string,
      process.env.DEV_CLIENT_ORIGIN as string,
    ],
    allowClientError,
    true, // debug
  );
