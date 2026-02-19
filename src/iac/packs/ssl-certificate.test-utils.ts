import { SimpleCFT } from "../SimpleCFT";
import { addSSLCertificate } from "./ssl-certificate";

export const runSSLCertificatePackScenario = () => {
  const defaultTemplate = new SimpleCFT()
    .applyPack(addSSLCertificate, {
      id: "Certificate",
      domainName: "example.com",
      hostedZoneId: "HZ123",
    })
    .toJSON();

  const customTemplate = new SimpleCFT()
    .applyPack(addSSLCertificate, {
      id: "Certificate",
      domainName: "example.com",
      hostedZoneId: "HZ456",
      includeWildCard: false,
    })
    .toJSON();

  const defaultResources = defaultTemplate.Resources || {};
  const customResources = customTemplate.Resources || {};
  const defaultCertificate = defaultResources.Certificate as any;
  const customCertificate = customResources.Certificate as any;

  return {
    resourceKeys: Object.keys(defaultResources).sort(),
    defaultDomainName: defaultCertificate?.Properties?.DomainName,
    defaultHostedZoneId:
      defaultCertificate?.Properties?.DomainValidationOptions?.[0]
        ?.HostedZoneId,
    defaultSANs: defaultCertificate?.Properties?.SubjectAlternativeNames,
    customHostedZoneId:
      customCertificate?.Properties?.DomainValidationOptions?.[0]?.HostedZoneId,
    customSANs: customCertificate?.Properties?.SubjectAlternativeNames ?? null,
  };
};

export const runSSLCertificatePackResourceKeysScenario = async () =>
  (await runSSLCertificatePackScenario()).resourceKeys;

export const runSSLCertificatePackDefaultDomainNameScenario = async () =>
  (await runSSLCertificatePackScenario()).defaultDomainName;

export const runSSLCertificatePackDefaultHostedZoneIdScenario = async () =>
  (await runSSLCertificatePackScenario()).defaultHostedZoneId;

export const runSSLCertificatePackDefaultSANsScenario = async () =>
  (await runSSLCertificatePackScenario()).defaultSANs;

export const runSSLCertificatePackCustomHostedZoneIdScenario = async () =>
  (await runSSLCertificatePackScenario()).customHostedZoneId;

export const runSSLCertificatePackCustomSANsScenario = async () =>
  (await runSSLCertificatePackScenario()).customSANs;
