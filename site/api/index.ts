import { AWS, handleCloudFunctionEvent } from "../../src/api/Router";
import { type CloudFunctionResponse } from "../../src/api/Router/Types";
import {
  ERROR_MESSAGE_CONSTANTS,
  PRIMITIVE_ERROR_MESSAGE_CONSTANTS,
} from "../../src/common/TypeParsing/Validation";
import { TypeInfoORMServiceError } from "../../src/common/TypeInfoORM";
import { ROUTE_MAP_WITH_DB } from "./routeMap";

/**
 * Filters errors to determine whether they are safe to return to clients.
 */
const allowClientError = (error: unknown): boolean => {
  if (error && typeof error === "object" && "error" in error) {
    const { error: mainError } = error;

    if (typeof mainError === "string") {
      const primitiveErrorValues = Object.values(
        PRIMITIVE_ERROR_MESSAGE_CONSTANTS,
      );
      const validationErrorValues = Object.values(ERROR_MESSAGE_CONSTANTS);
      const typeInfoORMErrorValues = Object.values(TypeInfoORMServiceError);

      if (primitiveErrorValues.includes(mainError)) {
        return true;
      }

      if (validationErrorValues.includes(mainError)) {
        return true;
      }

      if (typeInfoORMErrorValues.includes(mainError as TypeInfoORMServiceError)) {
        return true;
      }
    }
  }

  return false;
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
    // TODO: What to really do with this?
    //  How do we decide which errors should go to the client?
    allowClientError,
    true, // debug
  );
