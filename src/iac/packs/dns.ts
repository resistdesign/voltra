import { createResourcePack, SimpleCFT } from "../utils";

export type AddDNSConfig = {
  hostedZoneIdParameterName: string;
  domainNameParameterName: string;
  localUIDevelopmentDomainName: string;
};

export const addDNS = createResourcePack(
  ({
    hostedZoneIdParameterName,
    domainNameParameterName,
    localUIDevelopmentDomainName,
  }: AddDNSConfig) =>
    new SimpleCFT()
      .addParameterGroup({
        Label: "DNS",
        Parameters: {
          [hostedZoneIdParameterName]: {
            Label: "Hosted Zone ID",
            Type: "AWS::Route53::HostedZone::Id",
            Description: "Hosted Zone ID",
          },
          [domainNameParameterName]: {
            Label: "Domain Name",
            Type: "String",
            Description: "Domain name for the hosted zone",
            Default: "example.com",
          },
        },
      })
      .patch({
        Resources: {
          [localUIDevelopmentDomainName]: {
            Type: "AWS::Route53::RecordSet",
            DeletionPolicy: "Delete",
            Properties: {
              HostedZoneId: {
                Ref: hostedZoneIdParameterName,
              },
              Type: "A",
              Name: {
                "Fn::Sub": [
                  "app-local.${BaseDomainName}",
                  {
                    BaseDomainName: {
                      Ref: domainNameParameterName,
                    },
                  },
                ],
              },
              ResourceRecords: ["127.0.0.1"],
              TTL: "300",
            },
          },
        },
      }).template,
);
