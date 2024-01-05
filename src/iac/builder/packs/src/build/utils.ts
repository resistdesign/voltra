import YAML from 'yaml';

export type AtLeastOne<T, U = { [K in keyof T]: Pick<T, K> }> = Partial<T> & U[keyof U];

export const COMMAND_HELPERS = {
  updateFunction: ({ cloudFunctionArn, codeZipFilePath }: { cloudFunctionArn: string; codeZipFilePath: string }) =>
    `aws lambda update-function-code --function-name "${cloudFunctionArn}" --zip-file "fileb://${codeZipFilePath}"`,
  copyDirectoryToS3: ({ s3Domain, directoryPath }: { s3Domain: string; directoryPath: string }) =>
    `aws s3 cp --recursive --acl public-read ${directoryPath} s3://${s3Domain}/`,
  cloudFrontInvalidation: ({
                             cloudFrontDistributionId,
                             pathsToInvalidate = ['/*'],
                           }: {
    cloudFrontDistributionId: string;
    pathsToInvalidate?: string[];
  }) => `aws cloudfront create-invalidation --distribution-id "${cloudFrontDistributionId}" --paths "${pathsToInvalidate.join('" "')}"`,
  addNPMTokenWithNPMRC: ({ npmToken }: {
    npmToken: string
  }) => `echo '//registry.npmjs.org/:_authToken=${npmToken}' > .npmrc`,
};

export type LinuxUserNameString = string;

export type YesOrNo = 'yes' | 'no';

export interface Env {
  shell?: 'bash' | '/bin/sh' | 'powershell.exe' | 'cmd.exe' | string;
  variables?: Record<string, string>;
  'parameter-store'?: Record<string, string>;
  'exported-variables'?: string[];
  'secrets-manager'?: Record<string, `${string}:${string}:${string}:${string}`>;
  'git-credential-helper'?: YesOrNo;
}

export interface Proxy {
  'upload-artifacts'?: YesOrNo;
  logs?: YesOrNo;
}

export interface Batch {
  'fast-fail'?: boolean;
  'build-list'?: any;
  'build-matrix'?: any;
  'build-graph'?: any;

  [key: string]: any;
}

export interface Phase {
  'runtime-versions'?: Record<string, any>;
  'run-as'?: LinuxUserNameString;
  'on-failure'?: 'ABORT' | 'CONTINUE';
  commands: string[];
  finally?: string[];
}

export type PhaseConfig = AtLeastOne<{
  install: Phase;
  pre_build: Phase;
  build: Phase;
  post_build: Phase;
}>;

export interface ReportGroupNameOrArn {
  files?: string[];
  'base-directory'?: string;
  'discard-paths'?: string;
  'file-format'?: string;
}

export interface Reports {
  'report-group-name-or-arn'?: ReportGroupNameOrArn;
}

export interface ArtifactIdentifier {
  files?: string[];
  name?: string;
  'discard-paths'?: string;
  'base-directory'?: string;
}

export interface SecondaryArtifacts {
  artifactIdentifier?: ArtifactIdentifier;
}

export interface Artifacts {
  files?: string[];
  name?: string;
  'discard-paths'?: string;
  'base-directory'?: string;
  'exclude-paths'?: string;
  'enable-symlinks'?: string;
  's3-prefix'?: string;
  'secondary-artifacts'?: SecondaryArtifacts;
}

export interface Cache {
  paths?: string[];
}

export interface BuildSpec {
  version?: number;
  'run-as'?: LinuxUserNameString;
  env?: Env;
  proxy?: Proxy;
  batch?: Batch;
  phases: PhaseConfig;
  reports?: Reports;
  artifacts?: Artifacts;
  cache?: Cache;
}

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
