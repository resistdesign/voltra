import {
  getNamespaceStructure,
} from "./Utils";
import {
  renderCommentBlock,
  renderPrimitiveType,
  renderPropertyName,
  renderPropertyType,
  renderTypeFromPropertyType,
  renderTypeFromResourceType,
} from "./Renderers";

export const runIaCTypesUtilsScenario = () => {
  const specification = {
    PropertyTypes: {
      "AWS::S3::Bucket.CorsConfiguration": {
        Properties: {
          CorsRules: {
            Type: "List",
            ItemType: "CorsRule",
          },
        },
      },
      "AWS::S3::Bucket.CorsRule": {
        Properties: {
          AllowedOrigins: {
            Type: "List",
            PrimitiveItemType: "String",
          },
        },
      },
    },
    ResourceTypes: {
      "AWS::S3::Bucket": {
        Properties: {
          BucketName: {
            PrimitiveType: "String",
            Required: false,
          },
        },
        Attributes: {
          Arn: {
            PrimitiveType: "String",
          },
        },
      },
    },
    ResourceSpecificationVersion: "1.0.0",
  } as const;

  const baseStructure = {
    path: [],
    includes: ["export type Existing = string;"],
  };

  const structure = getNamespaceStructure(
    specification,
    baseStructure,
  );
  const bucketNamespace =
    structure.namespaces?.AWS?.namespaces?.S3?.namespaces?.Bucket;

  return {
    includes: structure.includes,
    bucketResourceType:
      structure.namespaces?.AWS?.namespaces?.S3?.resourceTypes?.Bucket?.Type,
    propertyTypeKeys: Object.keys(
      bucketNamespace?.propertyTypes || {},
    ).sort(),
    corsRulesType:
      bucketNamespace?.propertyTypes?.CorsConfiguration?.Properties?.CorsRules
        ?.Type,
  };
};

export const runIaCTypesRenderersScenario = () => {
  const primitiveType = renderPrimitiveType("String");
  const listPrimitiveType = renderPropertyType(
    ["AWS", "S3", "Bucket"],
    {
      Type: "List",
      PrimitiveItemType: "String",
    },
  );
  const listItemType = renderPropertyType(
    ["AWS", "S3", "Bucket"],
    {
      Type: "List",
      ItemType: "CorsRule",
    },
  );
  const tagItemType = renderPropertyType(
    ["AWS", "S3", "Bucket"],
    {
      Type: "List",
      ItemType: "Tag",
    },
  );
  const propertyName = renderPropertyName(
    "x-amz-meta.custom",
    {
      Required: false,
    },
  );
  const commentBlock = renderCommentBlock({
    UpdateType: "Immutable",
    DuplicatesAllowed: true,
    Documentation: "https://docs.example.com",
  });
  const propertyType = renderTypeFromPropertyType(
    ["AWS", "S3", "Bucket"],
    "CorsRule",
    {
      Properties: {
        AllowedOrigins: {
          Type: "List",
          PrimitiveItemType: "String",
        },
      },
    },
  );
  const resourceType = renderTypeFromResourceType(
    ["AWS", "S3"],
    "Bucket",
    {
      Type: "AWS::S3::Bucket",
      Properties: {
        BucketName: {
          PrimitiveType: "String",
          Required: false,
        },
      },
      Attributes: {
        Arn: {
          PrimitiveType: "String",
        },
      },
    },
  );

  return {
    primitiveType,
    listPrimitiveType,
    listItemType,
    tagItemType,
    propertyName,
    commentBlock,
    propertyType,
    resourceType,
  };
};
