/**
 * @packageDocumentation
 *
 * Build spec helpers and CLI command templates for build pipelines.
 */
import YAML from "yaml";

/**
 * Require at least one key from the provided type.
 *
 * @typeParam T - Base object type.
 * @typeParam U - Helper mapped type.
 */
export type AtLeastOne<T, U = { [K in keyof T]: Pick<T, K> }> = Partial<T> &
  U[keyof U];

/**
 * Helper functions for generating CLI commands in build specs.
 */
export const COMMAND_HELPERS = {
  updateFunction: ({
    cloudFunctionArn,
    codeZipFilePath,
  }: {
    cloudFunctionArn: string;
    codeZipFilePath: string;
  }) =>
    `aws lambda update-function-code --function-name "${cloudFunctionArn}" --zip-file "fileb://${codeZipFilePath}"`,
  copyDirectoryToS3: ({
    s3Domain,
    directoryPath,
  }: {
    s3Domain: string;
    directoryPath: string;
  }) =>
    `aws s3 cp --recursive --acl public-read ${directoryPath} s3://${s3Domain}/`,
  cloudFrontInvalidation: ({
    cloudFrontDistributionId,
    pathsToInvalidate = ["/*"],
  }: {
    cloudFrontDistributionId: string;
    pathsToInvalidate?: string[];
  }) =>
    `aws cloudfront create-invalidation --distribution-id "${cloudFrontDistributionId}" --paths "${pathsToInvalidate.join('" "')}"`,
  addNPMTokenWithNPMRC: ({ npmToken }: { npmToken: string }) =>
    `echo '//registry.npmjs.org/:_authToken=${npmToken}' > .npmrc`,
};

/**
 * Linux user name string.
 */
export type LinuxUserNameString = string;

/**
 * Flag value for yes/no configuration fields.
 */
export type YesOrNo = "yes" | "no";

/**
 * BuildSpec environment configuration.
 */
export interface Env {
  /**
   * Shell to use for command execution.
   */
  shell?: "bash" | "/bin/sh" | "powershell.exe" | "cmd.exe" | string;
  /**
   * Environment variables to expose.
   */
  variables?: Record<string, string>;
  /**
   * SSM parameter store references.
   */
  "parameter-store"?: Record<string, string>;
  /**
   * Exported variable names.
   */
  "exported-variables"?: string[];
  /**
   * Secrets Manager references.
   */
  "secrets-manager"?: Record<string, `${string}:${string}:${string}:${string}`>;
  /**
   * Whether to enable git credential helper.
   */
  "git-credential-helper"?: YesOrNo;
}

/**
 * BuildSpec proxy configuration.
 */
export interface Proxy {
  /**
   * Whether to upload build artifacts via proxy.
   */
  "upload-artifacts"?: YesOrNo;
  /**
   * Whether to proxy logs.
   */
  logs?: YesOrNo;
}

/**
 * BuildSpec batch build configuration.
 */
export interface Batch {
  /**
   * Whether to fail fast for batch builds.
   */
  "fast-fail"?: boolean;
  /**
   * Batch build list config.
   */
  "build-list"?: any;
  /**
   * Batch build matrix config.
   */
  "build-matrix"?: any;
  /**
   * Batch build graph config.
   */
  "build-graph"?: any;

  [key: string]: any;
}

/**
 * BuildSpec phase configuration.
 */
export interface Phase {
  /**
   * Runtime versions for this phase.
   */
  "runtime-versions"?: Record<string, any>;
  /**
   * User to run commands as.
   */
  "run-as"?: LinuxUserNameString;
  /**
   * Behavior when a command fails.
   */
  "on-failure"?: "ABORT" | "CONTINUE";
  /**
   * Commands to run during the phase.
   */
  commands: string[];
  /**
   * Commands to always run at the end of the phase.
   */
  finally?: string[];
}

/**
 * BuildSpec phase collection (at least one phase required).
 */
export type PhaseConfig = AtLeastOne<{
  install: Phase;
  pre_build: Phase;
  build: Phase;
  post_build: Phase;
}>;

/**
 * Report group configuration for build reports.
 */
export interface ReportGroupNameOrArn {
  /**
   * Report files to include.
   */
  files?: string[];
  /**
   * Base directory for report files.
   */
  "base-directory"?: string;
  /**
   * Whether to discard path prefixes.
   */
  "discard-paths"?: string;
  /**
   * Report file format.
   */
  "file-format"?: string;
}

/**
 * Reports configuration for BuildSpec.
 */
export interface Reports {
  /**
   * Report group name or ARN.
   */
  "report-group-name-or-arn"?: ReportGroupNameOrArn;
}

/**
 * Artifact identifier configuration.
 */
export interface ArtifactIdentifier {
  /**
   * Artifact file list.
   */
  files?: string[];
  /**
   * Artifact name.
   */
  name?: string;
  /**
   * Whether to discard path prefixes.
   */
  "discard-paths"?: string;
  /**
   * Base directory for artifact files.
   */
  "base-directory"?: string;
}

/**
 * Secondary artifacts configuration.
 */
export interface SecondaryArtifacts {
  /**
   * Artifact identifier for secondary artifacts.
   */
  artifactIdentifier?: ArtifactIdentifier;
}

/**
 * Artifacts configuration for BuildSpec.
 */
export interface Artifacts {
  /**
   * Artifact file list.
   */
  files?: string[];
  /**
   * Artifact name.
   */
  name?: string;
  /**
   * Whether to discard path prefixes.
   */
  "discard-paths"?: string;
  /**
   * Base directory for artifact files.
   */
  "base-directory"?: string;
  /**
   * Paths to exclude from artifacts.
   */
  "exclude-paths"?: string;
  /**
   * Whether to enable symlinks in artifacts.
   */
  "enable-symlinks"?: string;
  /**
   * S3 prefix for artifact upload.
   */
  "s3-prefix"?: string;
  /**
   * Secondary artifacts configuration.
   */
  "secondary-artifacts"?: SecondaryArtifacts;
}

/**
 * Cache configuration for BuildSpec.
 */
export interface Cache {
  /**
   * Cache paths to persist between builds.
   */
  paths?: string[];
}

/**
 * BuildSpec configuration object.
 */
export interface BuildSpec {
  /**
   * Build spec version.
   */
  version?: number;
  /**
   * User to run build commands as.
   */
  "run-as"?: LinuxUserNameString;
  /**
   * Environment configuration.
   */
  env?: Env;
  /**
   * Proxy configuration.
   */
  proxy?: Proxy;
  /**
   * Batch build configuration.
   */
  batch?: Batch;
  /**
   * Build phases configuration.
   */
  phases: PhaseConfig;
  /**
   * Reports configuration.
   */
  reports?: Reports;
  /**
   * Artifacts configuration.
   */
  artifacts?: Artifacts;
  /**
   * Cache configuration.
   */
  cache?: Cache;
}

/**
 * Create a build spec YAML string for a build pipeline (CI/CD).
 *
 * @param config - Build spec configuration.
 * @returns YAML string for the build spec.
 */
export const createBuildSpec = ({ version = 0.2, phases }: BuildSpec): string =>
  YAML.stringify(
    // TRICKY: Removed all keys with a value of `undefined`.
    JSON.parse(
      JSON.stringify({
        version,
        phases,
      }),
    ),
  );
