import type {
  AuthInfo,
  CORSPattern,
  RouteAuthConfig,
  RouteMap,
} from "../Router/Types";
import type {
  DataItemDBDriver,
  DataItemDBDriverConfig,
  ItemRelationshipDBDriver,
} from "../ORM/drivers/common/Types";
import type {
  TypeInfoDataItem,
  TypeInfoMap,
} from "../../common/TypeParsing/TypeInfo";
import type {
  TypeInfoORMDACConfig,
  TypeInfoORMIndexingConfig,
} from "../ORM/TypeInfoORMService";

/**
 * Overrides for building in-memory item drivers per type.
 */
export type DBXDriverConfigOverrides = Partial<
  Omit<
    DataItemDBDriverConfig<TypeInfoDataItem, string>,
    "uniquelyIdentifyingFieldName"
  >
>;

/**
 * Configuration for constructing a DBX in-memory runtime.
 */
export type DBXRuntimeConfig = {
  /**
   * Type info map used to validate and shape items.
   */
  typeInfoMap: TypeInfoMap;
  /**
   * Optional list of type names to materialize as item drivers.
   */
  itemTypeNames?: string[];
  /**
   * Optional overrides for per-type driver configs.
   */
  driverConfigByType?: Record<string, DBXDriverConfigOverrides>;
  /**
   * Optional map of custom ID generators for item types.
   */
  idGeneratorsByType?: Record<string, (targetItem: TypeInfoDataItem) => string>;
  /**
   * Optional prebuilt drivers keyed by type name.
   */
  drivers?: Record<string, DataItemDBDriver<any, any>>;
  /**
   * Optional relationship driver to use when relation indexing is disabled.
   */
  relationshipDriver?: ItemRelationshipDBDriver;
  /**
   * Optional indexing configuration override.
   */
  indexing?: Partial<TypeInfoORMIndexingConfig>;
  /**
   * When true (default), in-memory indexing backends are supplied.
   */
  useInMemoryIndexing?: boolean;
  /**
   * Base path prefix for ORM routes.
   */
  basePath?: string;
  /**
   * Route auth configuration for ORM routes.
   */
  authConfig?: RouteAuthConfig;
  /**
   * Allowed origins used to generate CORS headers.
   */
  allowedOrigins?: CORSPattern[];
  /**
   * Optional DAC configuration (excluding accessing role).
   */
  dacConfig?: TypeInfoORMDACConfig;
  /**
   * Optional accessor to resolve the accessing role id from auth info.
   */
  getAccessingRoleId?: (authInfo: AuthInfo) => string;
  /**
   * Optional predicate to decide whether errors are exposed.
   */
  errorShouldBeExposedToClient?: (error: unknown) => boolean;
};

/**
 * Resolved DBX runtime dependencies for tests.
 */
export type DBXRuntime = {
  /**
   * Type info map used by the ORM service.
   */
  typeInfoMap: TypeInfoMap;
  /**
   * Base path prefix for ORM routes.
   */
  basePath: string;
  /**
   * Route map bound to the in-memory ORM service.
   */
  routeMap: RouteMap;
  /**
   * Allowed origins for CORS headers.
   */
  allowedOrigins: CORSPattern[];
  /**
   * Driver resolver for item types.
   */
  getDriver: (typeName: string) => DataItemDBDriver<any, any>;
  /**
   * Built driver instances keyed by type name.
   */
  drivers: Record<string, DataItemDBDriver<any, any>>;
  /**
   * Optional relationship driver used when relation indexing is off.
   */
  relationshipDriver?: ItemRelationshipDBDriver;
  /**
   * Indexing configuration used by the ORM service.
   */
  indexing?: TypeInfoORMIndexingConfig;
  /**
   * Optional auth config applied to ORM routes.
   */
  authConfig?: RouteAuthConfig;
  /**
   * Optional DAC configuration excluding accessing role.
   */
  dacConfig?: TypeInfoORMDACConfig;
  /**
   * Optional accessor to resolve the accessing role id from auth info.
   */
  getAccessingRoleId?: (authInfo: AuthInfo) => string;
  /**
   * Optional predicate to decide whether errors are exposed.
   */
  errorShouldBeExposedToClient?: (error: unknown) => boolean;
};

/**
 * Input payload for a DBX router request.
 */
export type DBXRequestInput = {
  /**
   * HTTP method for the request.
   */
  method: string;
  /**
   * Route path segment, relative to the DBX base path.
   */
  path: string;
  /**
   * Arguments passed to the handler (body array).
   */
  args?: any[];
  /**
   * Optional body payload (used when args are omitted).
   */
  body?: any;
  /**
   * Optional headers to include on the request.
   */
  headers?: Record<string, string>;
  /**
   * Optional auth info for the request.
   */
  auth?: AuthInfo;
  /**
   * Optional origin header value.
   */
  origin?: string;
};

/**
 * Parsed response returned by the DBX request runner.
 */
export type DBXResponse<T = unknown> = {
  /**
   * HTTP status code returned by the router.
   */
  statusCode: number;
  /**
   * Response headers returned by the router.
   */
  headers: Record<string, string>;
  /**
   * Raw response body string.
   */
  body: string;
  /**
   * Parsed response body when JSON parsing succeeds.
   */
  parsedBody?: T;
};
