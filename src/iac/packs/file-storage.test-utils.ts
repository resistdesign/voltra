import { SimpleCFT } from "../SimpleCFT";
import { addSecureFileStorage } from "./file-storage";

export const runFileStoragePackScenario = () => {
  const defaultTemplate = new SimpleCFT()
    .applyPack(addSecureFileStorage, {
      id: "FileStorage",
    })
    .toJSON();

  const customTemplate = new SimpleCFT()
    .applyPack(addSecureFileStorage, {
      id: "FileStorage",
      bucketName: "files.example.com",
      shouldDelete: false,
      blockPublicAccess: false,
      cors: true,
      accessControl: "Private",
      allowACLs: true,
    })
    .toJSON();

  const defaultResources = defaultTemplate.Resources || {};
  const customResources = customTemplate.Resources || {};
  const defaultBucket = defaultResources.FileStorage as any;
  const customBucket = customResources.FileStorage as any;

  return {
    resourceKeys: Object.keys(defaultResources).sort(),
    defaultDeletionPolicy: defaultBucket?.DeletionPolicy,
    defaultPublicAccess:
      defaultBucket?.Properties?.PublicAccessBlockConfiguration,
    defaultCors: defaultBucket?.Properties?.CorsConfiguration ?? null,
    defaultOwnershipControls:
      defaultBucket?.Properties?.OwnershipControls ?? null,
    defaultEncryption:
      defaultBucket?.Properties?.BucketEncryption
        ?.ServerSideEncryptionConfiguration,
    customDeletionPolicy: customBucket?.DeletionPolicy,
    customBucketName: customBucket?.Properties?.BucketName,
    customAccessControl: customBucket?.Properties?.AccessControl,
    customPublicAccess:
      customBucket?.Properties?.PublicAccessBlockConfiguration,
    customCors: customBucket?.Properties?.CorsConfiguration,
    customOwnershipControls: customBucket?.Properties?.OwnershipControls,
  };
};

export const runFileStoragePackResourceKeysScenario = async () =>
  (await runFileStoragePackScenario()).resourceKeys;

export const runFileStoragePackDefaultDeletionPolicyScenario = async () =>
  (await runFileStoragePackScenario()).defaultDeletionPolicy;

export const runFileStoragePackDefaultPublicAccessScenario = async () =>
  (await runFileStoragePackScenario()).defaultPublicAccess;

export const runFileStoragePackDefaultCorsScenario = async () =>
  (await runFileStoragePackScenario()).defaultCors;

export const runFileStoragePackDefaultOwnershipControlsScenario = async () =>
  (await runFileStoragePackScenario()).defaultOwnershipControls;

export const runFileStoragePackDefaultEncryptionScenario = async () =>
  (await runFileStoragePackScenario()).defaultEncryption;

export const runFileStoragePackCustomDeletionPolicyScenario = async () =>
  (await runFileStoragePackScenario()).customDeletionPolicy;

export const runFileStoragePackCustomBucketNameScenario = async () =>
  (await runFileStoragePackScenario()).customBucketName;

export const runFileStoragePackCustomAccessControlScenario = async () =>
  (await runFileStoragePackScenario()).customAccessControl;

export const runFileStoragePackCustomPublicAccessScenario = async () =>
  (await runFileStoragePackScenario()).customPublicAccess;

export const runFileStoragePackCustomCorsScenario = async () =>
  (await runFileStoragePackScenario()).customCors;

export const runFileStoragePackCustomOwnershipControlsScenario = async () =>
  (await runFileStoragePackScenario()).customOwnershipControls;
