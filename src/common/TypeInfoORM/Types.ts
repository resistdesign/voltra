import {
  ListItemsConfig,
  ListItemsResults,
  ListRelationshipsConfig,
} from "../SearchTypes";
import {
  BaseItemRelationshipInfo,
  ItemRelationshipInfo,
  ItemRelationshipOriginatingItemInfo,
} from "../ItemRelationshipInfo";
import { TypeInfoDataItem } from "../TypeParsing/TypeInfo";

/**
 * Error types for a TypeInfoORM service.
 * */
export const TYPE_INFO_ORM_SERVICE_ERRORS = {
  NO_DRIVERS_SUPPLIED: "NO_DRIVERS_SUPPLIED",
  NO_RELATIONSHIP_DRIVERS_SUPPLIED: "NO_RELATIONSHIP_DRIVERS_SUPPLIED",
  NO_PRIMARY_FIELD_VALUE_SUPPLIED: "NO_PRIMARY_FIELD_VALUE_SUPPLIED",
  INVALID_DRIVER: "INVALID_DRIVER",
  INVALID_RELATIONSHIP_DRIVER: "INVALID_RELATIONSHIP_DRIVER",
  INVALID_TYPE_INFO: "INVALID_TYPE_INFO",
  INVALID_RELATIONSHIP: "INVALID_RELATIONSHIP",
};

/**
 * A collection of kebab-case route paths for a TypeInfoORM API.
 * */
export enum TypeInfoORMAPIRoutePaths {
  CREATE = "create",
  READ = "read",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  CREATE_RELATIONSHIP = "create-relationship",
  DELETE_RELATIONSHIP = "delete-relationship",
  LIST_RELATIONSHIPS = "list-relationships",
  CLEANUP_RELATIONSHIPS = "cleanup-relationships",
}

// TODO: THis API is too raw. It should be more about connecting (relating) items.
/**
 * The API type for TypeInfoORM providers to implement.
 * */
export type TypeInfoORMAPI = {
  create: (typeName: string, item: TypeInfoDataItem) => Promise<any>;
  read: (typeName: string, primaryFieldValue: any) => Promise<TypeInfoDataItem>;
  update: (typeName: string, item: TypeInfoDataItem) => Promise<boolean>;
  delete: (typeName: string, primaryFieldValue: any) => Promise<boolean>;
  list: (
    typeName: string,
    config: ListItemsConfig,
  ) => Promise<boolean | ListItemsResults<TypeInfoDataItem>>;
  createRelationship: (
    relationshipItem: BaseItemRelationshipInfo,
  ) => Promise<string>;
  deletedRelationship: (
    relationshipItem: BaseItemRelationshipInfo,
  ) => Promise<boolean>;
  listRelationships: (
    config: ListRelationshipsConfig,
  ) => Promise<boolean | ListItemsResults<ItemRelationshipInfo>>;
  cleanupRelationships: (
    relationshipOriginatingItem: ItemRelationshipOriginatingItemInfo,
  ) => Promise<void>;
};
