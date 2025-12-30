/**
 * @packageDocumentation
 *
 * ACM certificate pack with optional wildcard SAN.
 */
import { createResourcePack } from "../utils";

export type AddSSLCertificateConfig = {
  /**
   * Certificate resource id.
   */
  id: string;
  /**
   * Base domain name for the certificate.
   */
  domainName: any;
  /**
   * Hosted zone id for DNS validation.
   */
  hostedZoneId: any;
  /**
   * Whether to include a wildcard SAN entry.
   */
  includeWildCard?: boolean;
};

/**
 * Add an automatic SSL Certificate for a domain and all of it's subdomains.
 *
 * @param config - SSL certificate configuration.
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
