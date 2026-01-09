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
import { fileURLToPath } from "url";
import { collectRequiredEnvironmentVariables } from "../../src/common/CommandLine/collectRequiredEnvironmentVariables";
import { BASE_DOMAIN, DOMAINS } from "../common/Constants";
import { DemoTypeInfoMap } from "../common/DemoTypeInfoMap";
import {
  indexingTableEnvVars,
  indexingTableNames,
} from "../common/IndexingTableNames";

const moduleDirname =
  typeof __dirname === "string"
    ? __dirname
    : Path.dirname(fileURLToPath(import.meta.url));

const ENV_VARS = collectRequiredEnvironmentVariables([
  "REPO_OWNER",
  "REPO_NAME",
  "REPO_BRANCH",
  "REPO_TOKEN",
]);
const OUTPUT_PATH = Path.join(
  moduleDirname,
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
    for (const typeName in DemoTypeInfoMap) {
      const { primaryField, tags: { persisted = false } = {} } =
        DemoTypeInfoMap[typeName];

      if (persisted && typeof primaryField === "string") {
        cft.applyPack(addDatabase, {
          tableId: `${typeName}Table`,
          tableName: typeName,
          attributes: {
            [primaryField]: "S",
          },
          keys: {
            [primaryField]: "HASH",
          },
        });
      }
    }

    const indexingTableIds = {
      fullText: {
        lossyPostings: "LossyPostingsTable",
        exactPostings: "ExactPostingsTable",
        docMirror: "FullTextDocMirrorTable",
        tokenStats: "FullTextTokenStatsTable",
        docTokens: "DocTokensTable",
        docTokenPositions: "DocTokenPositionsTable",
      },
      structured: {
        termIndex: "StructuredTermIndexTable",
        rangeIndex: "StructuredRangeIndexTable",
        docFields: "StructuredDocFieldsTable",
      },
      relations: {
        relationEdges: "RelationEdgesTable",
      },
    } as const;

    const addIndexingTable = (
      tableId: string,
      tableName: string,
      attributes: Record<string, "S">,
      keys: Record<string, "HASH" | "RANGE">,
    ) => {
      cft.applyPack(addDatabase, {
        tableId,
        tableName,
        attributes,
        keys,
      });
    };

    addIndexingTable(
      indexingTableIds.fullText.lossyPostings,
      indexingTableNames.fullText.lossyPostings,
      { pk: "S", sk: "S" },
      { pk: "HASH", sk: "RANGE" },
    );
    addIndexingTable(
      indexingTableIds.fullText.exactPostings,
      indexingTableNames.fullText.exactPostings,
      { pk: "S", sk: "S" },
      { pk: "HASH", sk: "RANGE" },
    );
    addIndexingTable(
      indexingTableIds.fullText.docMirror,
      indexingTableNames.fullText.docMirror,
      { pk: "S" },
      { pk: "HASH" },
    );
    addIndexingTable(
      indexingTableIds.fullText.tokenStats,
      indexingTableNames.fullText.tokenStats,
      { pk: "S" },
      { pk: "HASH" },
    );
    addIndexingTable(
      indexingTableIds.fullText.docTokens,
      indexingTableNames.fullText.docTokens,
      { pk: "S", sk: "S" },
      { pk: "HASH", sk: "RANGE" },
    );
    addIndexingTable(
      indexingTableIds.fullText.docTokenPositions,
      indexingTableNames.fullText.docTokenPositions,
      { pk: "S", sk: "S" },
      { pk: "HASH", sk: "RANGE" },
    );
    addIndexingTable(
      indexingTableIds.structured.termIndex,
      indexingTableNames.structured.termIndex,
      { termKey: "S", docId: "S" },
      { termKey: "HASH", docId: "RANGE" },
    );
    addIndexingTable(
      indexingTableIds.structured.rangeIndex,
      indexingTableNames.structured.rangeIndex,
      { field: "S", rangeKey: "S" },
      { field: "HASH", rangeKey: "RANGE" },
    );
    addIndexingTable(
      indexingTableIds.structured.docFields,
      indexingTableNames.structured.docFields,
      { docId: "S" },
      { docId: "HASH" },
    );
    addIndexingTable(
      indexingTableIds.relations.relationEdges,
      indexingTableNames.relations.relationEdges,
      { edgeKey: "S", otherId: "S" },
      { edgeKey: "HASH", otherId: "RANGE" },
    );

    cft.applyPack(addCloudFunction, {
      id: IDS.API.FUNCTION,
      environment: {
        Variables: {
          NODE_OPTIONS: "--enable-source-maps",
          CLIENT_ORIGIN: `https://${DOMAINS.APP}`,
          DEV_CLIENT_ORIGIN: `https://${DOMAINS.APP_LOCAL}:4321`,
          S3_API_BUCKET_NAME: {
            Ref: IDS.API.FILE_STORAGE,
          },
          ...Object.keys(DemoTypeInfoMap).reduce<Record<string, any>>(
            (acc, k) => {
              const { primaryField, tags: { persisted = false } = {} } =
                DemoTypeInfoMap[k];

              if (persisted && typeof primaryField === "string") {
                acc[`TABLE_${k.toUpperCase()}`] = {
                  Ref: `${k}Table`,
                };
              }

              return acc;
            },
            {},
          ),
          [indexingTableEnvVars.fullText.lossyPostings]: {
            Ref: indexingTableIds.fullText.lossyPostings,
          },
          [indexingTableEnvVars.fullText.exactPostings]: {
            Ref: indexingTableIds.fullText.exactPostings,
          },
          [indexingTableEnvVars.fullText.docMirror]: {
            Ref: indexingTableIds.fullText.docMirror,
          },
          [indexingTableEnvVars.fullText.tokenStats]: {
            Ref: indexingTableIds.fullText.tokenStats,
          },
          [indexingTableEnvVars.fullText.docTokens]: {
            Ref: indexingTableIds.fullText.docTokens,
          },
          [indexingTableEnvVars.fullText.docTokenPositions]: {
            Ref: indexingTableIds.fullText.docTokenPositions,
          },
          [indexingTableEnvVars.structured.termIndex]: {
            Ref: indexingTableIds.structured.termIndex,
          },
          [indexingTableEnvVars.structured.rangeIndex]: {
            Ref: indexingTableIds.structured.rangeIndex,
          },
          [indexingTableEnvVars.structured.docFields]: {
            Ref: indexingTableIds.structured.docFields,
          },
          [indexingTableEnvVars.relations.relationEdges]: {
            Ref: indexingTableIds.relations.relationEdges,
          },
        },
      },
      runtime: "nodejs20.x" as any,
      memorySize: 512,
    });
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
              commands: ["yarn site:build:demo-types", "yarn site:build:api"],
            },
            post_build: {
              commands: [
                'PWD_RETURN_DIR="$PWD"',
                'cd "${OutputDirectory}" && zip -qr "../${ZipFileName}.zip" *',
                'cd "$PWD_RETURN_DIR"',
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
