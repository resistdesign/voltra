// We need an API to be able to test backend code.
import { SimpleCFT } from "../../src/iac";
import {
  addBuildPipeline,
  addCloudFunction,
  addDNS,
  addGateway,
  addSecureFileStorage,
  addSSLCertificate,
  createBuildSpec,
} from "../../src/iac/packs";
import Path from "path";
import FS from "fs";

const ENV_VARS = {
  REPO_OWNER: process.env.REPO_OWNER,
  REPO_NAME: process.env.REPO_NAME,
  REPO_BRANCH: process.env.REPO_BRANCH,
  REPO_TOKEN: process.env.REPO_TOKEN,
};

// IMPORTANT: Verify that we have all required environment variables.
for (const k in ENV_VARS) {
  if (!ENV_VARS[k as keyof typeof ENV_VARS]) {
    throw new Error(`Missing required environment variable: ${k}`);
  }
}

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
  API: {
    FILE_STORAGE: "ApiFileStorage",
    GATEWAY: "APIGateway",
    FUNCTION: "APIFunction",
    BUILD_PIPELINE: "APIBuildPipeline",
  },
};
const BASE_DOMAIN = "demo.voltra.app";
const DOMAINS = {
  APP: `app.${BASE_DOMAIN}`,
  API: `api.${BASE_DOMAIN}`,
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
    hostedZoneIdParameterName: IDS.PARAMETERS.HOSTED_ZONE_ID,
    domainNameParameterName: BASE_DOMAIN,
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
    bucketName: {
      "Fn::Sub": [
        "api-files.${BaseDomainName}",
        {
          BaseDomainName: { Ref: BASE_DOMAIN },
        },
      ],
    },
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
  .applyPack(addCloudFunction, {
    id: IDS.API.FUNCTION,
    environment: {
      Variables: {
        CLIENT_ORIGIN: `https://${DOMAINS.APP}`,
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
    environmentVariables: [
      {
        Name: "NODE_AUTH_TOKEN",
        Type: "PLAINTEXT",
        Value: process.env.NODE_AUTH_TOKEN,
      },
    ],
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
              commands: [
                'echo "//npm.pkg.github.com/:_authToken=$NODE_AUTH_TOKEN" >> ./.npmrc',
                "npm i yarn",
                "yarn",
              ],
            },
            build: {
              commands: ["yarn build:api"],
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
          OutputDirectory: "./dist/api",
          ZipFileName: "api",
          ZipFileDirectory: "./dist/",
        },
      ],
    },
    repoConfig: {
      owner: {
        Ref: REPO_CREDENTIALS.OWNER,
      },
      repo: {
        Ref: REPO_CREDENTIALS.NAME,
      },
      branch: {
        Ref: REPO_CREDENTIALS.BRANCH,
      },
      oauthToken: {
        Ref: REPO_CREDENTIALS.TOKEN,
      },
    },
  })
  .applyPack(addGateway, {
    id: IDS.API.GATEWAY,
    domainName: DOMAINS.API,
    certificateArn: "",
    cloudFunction: {
      id: IDS.API.FUNCTION,
      region: "us-east-1",
    },
    hostedZoneId: IDS.PARAMETERS.HOSTED_ZONE_ID,
  });

if (!FS.existsSync(DIR_NAME)) {
  FS.mkdirSync(DIR_NAME, { recursive: true });
}

FS.writeFileSync(OUTPUT_PATH, IaC.toYAML(), "utf8");
