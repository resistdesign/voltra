import { createResourcePack } from "../utils";

export type AddSSLCertificateConfig = {
  id: string;
  domainName: any;
  hostedZoneId: any;
  includeWildCard?: boolean;
};

/**
 * Add an automatic SSL Certificate for a domain and all of it's subdomains.
 * */
export const addSSLCertificate = createResourcePack(
  ({
    id,
    domainName,
    hostedZoneId,
    includeWildCard = true,
  }: AddSSLCertificateConfig) => ({
    Resources: {
      [id]: {
        Type: "AWS::CertificateManager::Certificate",
        Properties: {
          DomainName: domainName,
          ValidationMethod: "DNS",
          DomainValidationOptions: [
            {
              DomainName: domainName,
              HostedZoneId: hostedZoneId,
            },
          ],
          SubjectAlternativeNames: includeWildCard
            ? [
                {
                  "Fn::Sub": [
                    "*.${BaseDomainName}",
                    {
                      BaseDomainName: domainName,
                    },
                  ],
                },
              ]
            : undefined,
        },
      },
    },
  }),
);
