/**
 * @packageDocumentation
 *
 * Shared TypeInfoORM API types, route paths, and error enums used by services
 * and clients.
 */
import {
  ListItemsConfig,
  ListItemsResults,
  ListRelationshipsConfig,
} from "../SearchTypes";
import {
  BaseItemRelationshipInfo,
  ItemRelationshipInfo,
} from "../ItemRelationshipInfoTypes";
import { TypeInfoDataItem, TypeOperation } from "../TypeParsing/TypeInfo";

/**
 * The DAC Resource name for item relationships.
 * */
export const ITEM_RELATIONSHIP_DAC_RESOURCE_NAME =
  "TYPE_INFO_ORM_ITEM_RELATIONSHIP";

/**
 * A set of possible operations for a {@link ItemRelationshipInfo}.
 * */
export enum RelationshipOperation {
  /**
   * Read relationship info.
   * */
  GET = "GET",
  /**
   * Create or update a relationship.
   * */
  SET = "SET",
  /**
   * Remove a relationship.
   * */
  UNSET = "UNSET",
}

/**
 * A set groups of possible operations for a type, field value or relationship.
 * */
export enum OperationGroup {
  /**
   * All possible operations.
   * */
  ALL_OPERATIONS = "ALL_OPERATIONS",
  /**
   * All item CRUD operations.
   * */
  ALL_ITEM_OPERATIONS = "ALL_ITEM_OPERATIONS",
  /**
   * All relationship operations.
   * */
  ALL_RELATIONSHIP_OPERATIONS = "ALL_RELATIONSHIP_OPERATIONS",
}

/**
 * A set of possible ORM operations.
 * */
export type ORMOperation =
  | TypeOperation
  | RelationshipOperation
  | OperationGroup;

/**
 * Error types for a TypeInfoORM service.
 * */
export enum TypeInfoORMServiceError {
  /**
   * No data drivers were supplied.
   * */
  NO_DRIVERS_SUPPLIED = "NO_DRIVERS_SUPPLIED",
  /**
   * No relationship drivers were supplied.
   * */
  NO_RELATIONSHIP_DRIVERS_SUPPLIED = "NO_RELATIONSHIP_DRIVERS_SUPPLIED",
  /**
   * Missing required primary field value.
   * */
  NO_PRIMARY_FIELD_VALUE_SUPPLIED = "NO_PRIMARY_FIELD_VALUE_SUPPLIED",
  /**
   * Driver type is not supported for the request.
   * */
  INVALID_DRIVER = "INVALID_DRIVER",
  /**
   * Relationship driver type is not supported for the request.
   * */
  INVALID_RELATIONSHIP_DRIVER = "INVALID_RELATIONSHIP_DRIVER",
  /**
   * TypeInfo definition was not found or invalid.
   * */
  INVALID_TYPE_INFO = "INVALID_TYPE_INFO",
  /**
   * TypeInfo missing a primary field definition.
   * */
  TYPE_INFO_MISSING_PRIMARY_FIELD = "TYPE_INFO_MISSING_PRIMARY_FIELD",
  /**
   * Relationship payload is invalid.
   * */
  INVALID_RELATIONSHIP = "INVALID_RELATIONSHIP",
  /**
   * Operation is not supported.
   * */
  INVALID_OPERATION = "INVALID_OPERATION",
  /**
   * Indexing criteria is not supported.
   * */
  INDEXING_UNSUPPORTED_CRITERIA = "INDEXING_UNSUPPORTED_CRITERIA",
  /**
   * Indexing criteria combination is not supported.
   * */
  INDEXING_UNSUPPORTED_COMBINATION = "INDEXING_UNSUPPORTED_COMBINATION",
  /**
   * Required index field is missing.
   * */
  INDEXING_MISSING_INDEX_FIELD = "INDEXING_MISSING_INDEX_FIELD",
  /**
   * Indexing backend dependency is missing.
   * */
  INDEXING_MISSING_BACKEND = "INDEXING_MISSING_BACKEND",
  /**
   * Indexing operations require criteria to be provided.
   * */
  INDEXING_REQUIRES_CRITERIA = "INDEXING_REQUIRES_CRITERIA",
}

/**
 * A collection of kebab-case route paths for a TypeInfoORM API.
 * */
export enum TypeInfoORMAPIRoutePaths {
  /**
   * Create item route.
   * */
  CREATE = "create",
  /**
   * Read item route.
   * */
  READ = "read",
  /**
   * Update item route.
   * */
  UPDATE = "update",
  /**
   * Delete item route.
   * */
  DELETE = "delete",
  /**
   * List item route.
   * */
  LIST = "list",
  /**
   * Create relationship route.
   * */
  CREATE_RELATIONSHIP = "create-relationship",
  /**
   * Delete relationship route.
   * */
  DELETE_RELATIONSHIP = "delete-relationship",
  /**
   * List relationships route.
   * */
  LIST_RELATIONSHIPS = "list-relationships",
  /**
   * List related items route.
   * */
  LIST_RELATED_ITEMS = "list-related-items",
}

/**
 * The results of a delete relationship operation.
 */
export type DeleteRelationshipResults = {
  /**
   * Whether the delete operation succeeded.
   * */
  success: boolean;
  /**
   * Whether related items still exist after deletion.
   * */
  remainingItemsExist: boolean;
};

/**
 * The API type for TypeInfoORM providers to implement.
 * */
export type TypeInfoORMAPI = {
  /**
   * Create a relationship record.
   *
   * @param relationshipItem - Relationship payload to create.
   * @returns Whether the create succeeded.
   */
  createRelationship: (
    relationshipItem: BaseItemRelationshipInfo,
  ) => Promise<boolean>;
  /**
   * Delete a relationship record.
   *
   * @param relationshipItem - Relationship payload to delete.
   * @returns Results describing deletion outcome.
   */
  deleteRelationship: (
    relationshipItem: BaseItemRelationshipInfo,
  ) => Promise<DeleteRelationshipResults>;
  /**
   * List relationships matching the query.
   *
   * @param config - Relationship list configuration.
   * @returns Relationship list results.
   */
  listRelationships: (
    config: ListRelationshipsConfig,
  ) => Promise<ListItemsResults<ItemRelationshipInfo>>;
  /**
   * List related items for a relationship query.
   *
   * @param config - Relationship list configuration.
   * @param selectedFields - Optional fields to project.
   * @returns Related item list results.
   */
  listRelatedItems: (
    config: ListRelationshipsConfig,
    selectedFields?: (keyof TypeInfoDataItem)[],
  ) => Promise<ListItemsResults<Partial<TypeInfoDataItem>>>;
  /**
   * Create an item.
   *
   * @param typeName - Type name to create.
   * @param item - Item payload to create.
   * @returns The created item result.
   */
  create: (typeName: string, item: TypeInfoDataItem) => Promise<any>;
  /**
   * Read an item by primary field value.
   *
   * @param typeName - Type name to read.
   * @param primaryFieldValue - Primary field value to lookup.
   * @param selectedFields - Optional fields to project.
   * @returns Retrieved item data.
   */
  read: (
    typeName: string,
    primaryFieldValue: any,
    selectedFields?: (keyof TypeInfoDataItem)[],
  ) => Promise<Partial<TypeInfoDataItem>>;
  /**
   * Update an item.
   *
   * @param typeName - Type name to update.
   * @param item - Updated item payload.
   * @returns Whether the update succeeded.
   */
  update: (typeName: string, item: TypeInfoDataItem) => Promise<boolean>;
  /**
   * Delete an item by primary field value.
   *
   * @param typeName - Type name to delete.
   * @param primaryFieldValue - Primary field value to delete.
   * @returns Whether the delete succeeded.
   */
  delete: (typeName: string, primaryFieldValue: any) => Promise<boolean>;
  /**
   * List items matching the configuration.
   *
   * @param typeName - Type name to list.
   * @param config - List configuration.
   * @param selectedFields - Optional fields to project.
   * @returns List results.
   */
  list: (
    typeName: string,
    config: ListItemsConfig,
    selectedFields?: (keyof TypeInfoDataItem)[],
  ) => Promise<ListItemsResults<Partial<TypeInfoDataItem>>>;
};
