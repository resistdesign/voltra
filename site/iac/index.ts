// We need an API to be able to test backend code.
import { SimpleCFT } from "../../src/iac";
import { addDNS, addGateway, addSecureFileStorage } from "../../src/iac/packs";

const IDS = {
  PARAMETERS: {
    HOSTED_ZONE_ID: "HostedZoneId",
  },
  API: {
    FILE_STORAGE: "ApiFileStorage",
    GATEWAY: "APIGateway",
    FUNCTION: "APIFunction",
  },
};
const BASE_DOMAIN = "demo.voltra.app";
const DOMAINS = {
  APP: `app.${BASE_DOMAIN}`,
  API: `api.${BASE_DOMAIN}`,
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
