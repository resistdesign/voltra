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
 * A collection of kebab-case paths for the TypeInfoORM API.
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
