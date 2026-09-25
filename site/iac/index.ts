// This is the IaC for a Demo API used to test `api` package code.
import { SimpleCFT } from "../../src/iac";
import {
  addCloudFunction,
  addDatabase,
  addDNS,
  addIndexDatabase,
  addGateway,
  addSecureFileStorage,
  addSSLCertificate,
} from "../../src/iac/packs";
import Path from "path";
import FS from "fs";
import { fileURLToPath } from "url";
import {
  BASE_DOMAIN,
  DEMO_HEALTH_MCP_ROUTE_PATH,
  DEMO_MCP_ROUTE_PATH,
  DOMAINS,
} from "../common/Constants";
import { DemoTypeInfoMap } from "../common/DemoTypeInfoMap";
import { INDEXING_TABLE_ENV_VAR } from "../common/IndexingTable";
import { HEALTH_TABLE_ENV_VAR } from "../common/HealthTable";

const moduleDirname =
  typeof __dirname === "string"
    ? __dirname
    : Path.dirname(fileURLToPath(import.meta.url));

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
  },
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
          attributes: {
            [primaryField]: "S",
          },
          keys: {
            [primaryField]: "HASH",
          },
        });
      }
    }

    const indexingTableId = "IndexingTable";
    cft.applyPack(addIndexDatabase, {
      tableId: indexingTableId,
    });

    const healthTableId = "HealthTable";
    cft.applyPack(addDatabase, {
      tableId: healthTableId,
      attributes: { id: "S" },
      keys: { id: "HASH" },
    });

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
          [INDEXING_TABLE_ENV_VAR]: {
            Ref: indexingTableId,
          },
          [HEALTH_TABLE_ENV_VAR]: {
            Ref: healthTableId,
          },
        },
      },
      runtime: "nodejs20.x" as any,
      memorySize: 512,
    });
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
  })
  .patch({
    Outputs: {
      APIFunctionName: {
        Description: "AWS Lambda function name for the Voltra demo API.",
        Value: {
          Ref: IDS.API.FUNCTION,
        },
      },
      MCPDemoEndpoint: {
        Description: "Public read-only MCP endpoint for the Voltra demo API.",
        Value: `https://${DOMAINS.API}${DEMO_MCP_ROUTE_PATH}`,
      },
      HealthMCPDemoEndpoint: {
        Description:
          "Public non-destructive MCP endpoint for bounded Voltra Health previews.",
        Value: `https://${DOMAINS.API}${DEMO_HEALTH_MCP_ROUTE_PATH}`,
      },
    },
  });

if (!FS.existsSync(DIR_NAME)) {
  FS.mkdirSync(DIR_NAME, { recursive: true });
}

FS.writeFileSync(OUTPUT_PATH, IaC.toYAML(), "utf8");
