/**
 * @packageDocumentation
 *
 * Secure S3 bucket pack with configurable CORS and public access controls.
 */
import { AWS } from "../types/IaCTypes";
import { createResourcePack } from "../utils";

export type AddSecureFileStorageConfig = {
  /**
   * S3 bucket resource id.
   */
  id: string;
  /**
   * Optional bucket name.
   */
  bucketName?: any;
  /**
   * Whether to delete the bucket on stack delete.
   */
  shouldDelete?: boolean;
  /**
   * Whether to block all public access.
   */
  blockPublicAccess?: boolean;
  /**
   * CORS configuration or enablement flag.
   */
  cors?: AWS.S3.Bucket["Properties"]["CorsConfiguration"] | boolean;
  /**
   * ACL configuration for the bucket.
   */
  accessControl?: AWS.S3.Bucket["Properties"]["AccessControl"];
  /**
   * Whether to allow ACLs by enabling ownership controls.
   */
  allowACLs?: boolean;
};

/**
 * Add a secure S3 Bucket with an optional parameter to set the bucket name.
 *
 * @param config - File storage configuration.
 * */
export const addSecureFileStorage = createResourcePack(
  ({
    id,
    bucketName,
    shouldDelete = true,
    blockPublicAccess = true,
    cors = false,
    accessControl = undefined,
    allowACLs = false,
  }: AddSecureFileStorageConfig) => {
    return {
      Resources: {
        [id]: {
          Type: "AWS::S3::Bucket",
          DeletionPolicy: shouldDelete ? "Delete" : "Retain",
          Properties: {
            BucketName: bucketName,
            AccessControl: accessControl,
            OwnershipControls: allowACLs
              ? {
                  Rules: [
                    {
                      ObjectOwnership: "ObjectWriter",
                    },
                  ],
                }
              : undefined,
            CorsConfiguration:
              typeof cors === "object"
                ? cors
                : cors === true
                  ? {
                      CorsRules: [
                        {
                          AllowedHeaders: ["*"],
                          AllowedMethods: [
                            "GET",
                            "PUT",
                            "POST",
                            "DELETE",
                            "HEAD",
                          ],
                          AllowedOrigins: ["*"],
                        },
                      ],
                    }
                  : undefined,
            BucketEncryption: {
              ServerSideEncryptionConfiguration: [
                {
                  ServerSideEncryptionByDefault: {
                    SSEAlgorithm: "AES256",
                  },
                },
              ],
            },
            PublicAccessBlockConfiguration: blockPublicAccess
              ? {
                  BlockPublicAcls: true,
                  BlockPublicPolicy: true,
                  IgnorePublicAcls: true,
                  RestrictPublicBuckets: true,
                }
              : {
                  BlockPublicAcls: false,
                  BlockPublicPolicy: false,
                  IgnorePublicAcls: false,
                  RestrictPublicBuckets: false,
                },
          },
        },
      },
    };
  },
);
