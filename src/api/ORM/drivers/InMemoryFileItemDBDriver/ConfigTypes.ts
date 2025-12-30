/**
 * Configuration overrides for the in-memory file driver.
 */
export type InMemoryFileSpecificConfig = {
  /**
   * Prefix used when generating upload URLs.
   */
  uploadUrlPrefix?: string;
  /**
   * Prefix used when generating download URLs.
   */
  downloadUrlPrefix?: string;
};
