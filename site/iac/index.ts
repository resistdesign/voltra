// This is the IaC for a Demo API used to test `api` package code.
import { SimpleCFT } from "../../src/iac";
import {
  addBuildPipeline,
  addCloudFunction,
  addDatabase,
  addDNS,
  addGateway,
  addSecureFileStorage,
  addSSLCertificate,
  createBuildSpec,
} from "../../src/iac/packs";
import Path from "path";
import FS from "fs";
import { collectRequiredEnvironmentVariables } from "../../src/common/CommandLine/collectRequiredEnvironmentVariables";
import { DEMO_TYPE_INFO_MAP } from "../common/Constants";

const ENV_VARS = collectRequiredEnvironmentVariables([
  "REPO_OWNER",
  "REPO_NAME",
  "REPO_BRANCH",
  "REPO_TOKEN",
]);
const OUTPUT_PATH = Path.join(
  __dirname,
  "..",
  "..",
  "site-dist",
  "iac",
  "index.yml",
);
const DIR_NAME = Path.dirname(OUTPUT_PATH);
const IDS = {
  PARAMETERS: {
    HOSTED_ZONE_ID: "HostedZoneId",
  },
  COMMON: {
    SSL_CERTIFICATE: "SSLCertificate",
  },
  APP: {
    DEV_CLIENT_DOMAIN: "DevClientDomain",
  },
  API: {
    FILE_STORAGE: "ApiFileStorage",
    GATEWAY: "APIGateway",
    FUNCTION: "APIFunction",
    BUILD_PIPELINE: "APIBuildPipeline",
  },
};
const BASE_DOMAIN = "demo.voltra.app";
const DOMAINS = {
  APP: `docs.${BASE_DOMAIN}`,
  APP_LOCAL: `docs-local.${BASE_DOMAIN}`,
  API: `api.${BASE_DOMAIN}`,
  API_FILES: `api-files.${BASE_DOMAIN}`,
};
const REPO_CREDENTIALS = {
  OWNER: ENV_VARS.REPO_OWNER,
  NAME: ENV_VARS.REPO_NAME,
  BRANCH: ENV_VARS.REPO_BRANCH,
  TOKEN: ENV_VARS.REPO_TOKEN,
};

const IaC = new SimpleCFT({
  AWSTemplateFormatVersion: "2010-09-09",
  Description: "The Voltra API Demo Backend",
})
  .addParameterGroup({
    Label: "DNS",
    Parameters: {
      [IDS.PARAMETERS.HOSTED_ZONE_ID]: {
        Label: "Hosted Zone ID",
        Type: "String",
        Description: "The Hosted Zone ID for the domain",
      },
    },
  })
  .applyPack(addDNS, {
    id: IDS.APP.DEV_CLIENT_DOMAIN,
    domainName: DOMAINS.APP_LOCAL,
    hostedZoneId: {
      Ref: IDS.PARAMETERS.HOSTED_ZONE_ID,
    },
    recordType: "A",
    resourceRecords: ["127.0.0.1"],
  })
  .applyPack(addSSLCertificate, {
    id: IDS.COMMON.SSL_CERTIFICATE,
    domainName: BASE_DOMAIN,
    hostedZoneId: {
      Ref: IDS.PARAMETERS.HOSTED_ZONE_ID,
    },
  })
  .applyPack(addSecureFileStorage, {
    id: IDS.API.FILE_STORAGE,
    bucketName: DOMAINS.API_FILES,
    shouldDelete: true,
    blockPublicAccess: true,
    cors: {
      CorsRules: [
        {
          AllowedHeaders: ["*"],
          AllowedMethods: ["GET", "PUT", "POST", "DELETE", "HEAD"],
          AllowedOrigins: ["*"],
        },
      ],
    },
  })
  .modify((cft) => {
    for (const typeName in DEMO_TYPE_INFO_MAP) {
      const { primaryField, tags: { persisted = false } = {} } =
        DEMO_TYPE_INFO_MAP[typeName];

      if (persisted && typeof primaryField === "string") {
        cft.applyPack(addDatabase, {
          tableId: `${typeName}Table`,
          attributes: {
            [primaryField]: "S",
          },
          keys: {
            [primaryField]: "HASH",
          },
        });
      }
    }
  })
  .applyPack(addCloudFunction, {
    id: IDS.API.FUNCTION,
    environment: {
      Variables: {
        CLIENT_ORIGIN: `https://${DOMAINS.APP}`,
        DEV_CLIENT_ORIGIN: `https://${DOMAINS.APP_LOCAL}`,
        S3_API_BUCKET_NAME: {
          Ref: IDS.API.FILE_STORAGE,
        },
      },
    },
    runtime: "nodejs20.x" as any,
  })
  .applyPack(addBuildPipeline, {
    id: IDS.API.BUILD_PIPELINE,
    dependsOn: [IDS.API.FUNCTION],
    environmentComputeType: "BUILD_GENERAL1_SMALL",
    environmentImage: "aws/codebuild/standard:7.0",
    environmentType: "LINUX_CONTAINER",
    timeoutInMinutes: 10,
    buildSpec: {
      "Fn::Sub": [
        createBuildSpec({
          version: 0.2,
          phases: {
            install: {
              "runtime-versions": {
                nodejs: 20,
              },
              commands: ["yarn"],
            },
            build: {
              commands: ["yarn site:build:api"],
            },
            post_build: {
              commands: [
                'PWD_RETURN_DIR="${!PWD}"',
                "cd ${OutputDirectory} && zip -qr ../${ZipFileName}.zip * && cd ${!PWD_RETURN_DIR}",
                'aws lambda update-function-code --function-name "${APIFunctionArn}" --zip-file "fileb://${ZipFileDirectory}${ZipFileName}.zip"',
              ],
            },
          },
        }),
        {
          APIFunctionArn: {
            "Fn::GetAtt": [IDS.API.FUNCTION, "Arn"],
          },
          OutputDirectory: "./site-dist/api",
          ZipFileName: "api",
          ZipFileDirectory: "./site-dist/",
        },
      ],
    },
    repoConfig: {
      owner: REPO_CREDENTIALS.OWNER,
      repo: REPO_CREDENTIALS.NAME,
      branch: REPO_CREDENTIALS.BRANCH,
      oauthToken: REPO_CREDENTIALS.TOKEN,
    },
  })
  .applyPack(addGateway, {
    id: IDS.API.GATEWAY,
    domainName: DOMAINS.API,
    certificateArn: {
      Ref: IDS.COMMON.SSL_CERTIFICATE,
    },
    cloudFunction: {
      id: IDS.API.FUNCTION,
      region: "us-east-1",
    },
    hostedZoneId: {
      Ref: IDS.PARAMETERS.HOSTED_ZONE_ID,
    },
  });

if (!FS.existsSync(DIR_NAME)) {
  FS.mkdirSync(DIR_NAME, { recursive: true });
}

FS.writeFileSync(OUTPUT_PATH, IaC.toYAML(), "utf8");
