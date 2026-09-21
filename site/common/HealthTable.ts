/** Stable environment variable carrying the demo Health table name. */
export const HEALTH_TABLE_ENV_VAR = "HEALTH_TABLE";

/** Read the demo Health table name from an environment map. */
export const readHealthTableNameFromEnv = (
  env: NodeJS.ProcessEnv,
): string => env[HEALTH_TABLE_ENV_VAR] as string;
