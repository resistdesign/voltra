/**
 * @packageDocumentation
 *
 * Client wrapper around the TypeInfoORM API RouteMap. Uses ServiceConfig to
 * route requests to the server-side TypeInfoORM routes.
 */
import {
  DeleteRelationshipResults,
  TypeInfoORMAPI,
  TypeInfoORMAPIRoutePaths,
} from "../../common/TypeInfoORM";
import { sendServiceRequest, ServiceConfig } from "./Service";
import { TypeInfoDataItem } from "../../common/TypeParsing/TypeInfo";
import {
  ListItemsConfig,
  ListItemsResults,
  ListRelationshipsConfig,
} from "../../common/SearchTypes";
import {
  BaseItemRelationshipInfo,
  ItemRelationshipInfo,
} from "../../common/ItemRelationshipInfoTypes";

/**
 * A client for a TypeInfoORM API or service.
 *
 * @param config - The configuration pointing to the Type Info ORM `RouteMap`.
 * */
export class TypeInfoORMClient implements TypeInfoORMAPI {
  /**
   * Create a client for TypeInfoORM routes.
   *
   * @param config - Service configuration for the API routes.
   */
  constructor(private config: ServiceConfig) {}

  /**
   * Dispatch a request to the configured service.
   *
   * @param path - Route path for the ORM method.
   * @param args - Arguments to send in the request body.
   * @returns Parsed response payload.
   */
  protected makeRequest = async (
    path: TypeInfoORMAPIRoutePaths,
    args: any[],
  ): Promise<any> => {
    const result = await sendServiceRequest(this.config, path, args);

    return result;
  };

  /**
   * Create an item of the provided type.
   *
   * @param typeName - TypeInfo type name.
   * @param item - Item payload to persist.
   * @returns The created item result.
   */
  create = async (typeName: string, item: TypeInfoDataItem): Promise<any> => {
    return await this.makeRequest(TypeInfoORMAPIRoutePaths.CREATE, [
      typeName,
      item,
    ]);
  };

  /**
   * Read an item by its primary field value.
   *
   * @param typeName - TypeInfo type name.
   * @param primaryFieldValue - Primary field value to lookup.
   * @returns The retrieved item, if found.
   */
  read = async (
    typeName: string,
    primaryFieldValue: any,
  ): Promise<TypeInfoDataItem> => {
    return await this.makeRequest(TypeInfoORMAPIRoutePaths.READ, [
      typeName,
      primaryFieldValue,
    ]);
  };

  /**
   * Update an item by replacing it with the provided payload.
   *
   * @param typeName - TypeInfo type name.
   * @param item - Updated item payload.
   * @returns Whether the update succeeded.
   */
  update = async (
    typeName: string,
    item: TypeInfoDataItem,
  ): Promise<boolean> => {
    return await this.makeRequest(TypeInfoORMAPIRoutePaths.UPDATE, [
      typeName,
      item,
    ]);
  };

  /**
   * Delete an item by its primary field value.
   *
   * @param typeName - TypeInfo type name.
   * @param primaryFieldValue - Primary field value to delete.
   * @returns Whether the delete succeeded.
   */
  delete = async (
    typeName: string,
    primaryFieldValue: any,
  ): Promise<boolean> => {
    return await this.makeRequest(TypeInfoORMAPIRoutePaths.DELETE, [
      typeName,
      primaryFieldValue,
    ]);
  };

  /**
   * List items for a given type.
   *
   * @param typeName - TypeInfo type name.
   * @param config - List configuration including filters and paging.
   * @param selectedFields - Optional fields to project.
   * @returns List results for the query.
   */
  list = async (
    typeName: string,
    config: ListItemsConfig,
    selectedFields?: (keyof TypeInfoDataItem)[],
  ): Promise<ListItemsResults<TypeInfoDataItem>> => {
    return await this.makeRequest(TypeInfoORMAPIRoutePaths.LIST, [
      typeName,
      config,
      selectedFields,
    ]);
  };

  /**
   * Create a relationship between items.
   *
   * @param relationshipItem - Relationship payload.
   * @returns Whether the relationship was created.
   */
  createRelationship = async (
    relationshipItem: BaseItemRelationshipInfo,
  ): Promise<boolean> => {
    return await this.makeRequest(
      TypeInfoORMAPIRoutePaths.CREATE_RELATIONSHIP,
      [relationshipItem],
    );
  };

  /**
   * Delete a relationship between items.
   *
   * @param relationshipItem - Relationship payload.
   * @returns Results describing the deletion.
   */
  deleteRelationship = async (
    relationshipItem: BaseItemRelationshipInfo,
  ): Promise<DeleteRelationshipResults> => {
    return await this.makeRequest(
      TypeInfoORMAPIRoutePaths.DELETE_RELATIONSHIP,
      [relationshipItem],
    );
  };

  /**
   * List relationship records matching the query.
   *
   * @param config - Relationship list query configuration.
   * @returns Relationship list results.
   */
  listRelationships = async (
    config: ListRelationshipsConfig,
  ): Promise<ListItemsResults<ItemRelationshipInfo>> => {
    return await this.makeRequest(TypeInfoORMAPIRoutePaths.LIST_RELATIONSHIPS, [
      config,
    ]);
  };

  /**
   * List related items for a relationship query.
   *
   * @param config - Relationship list query configuration.
   * @param selectedFields - Optional fields to project on related items.
   * @returns Related item list results.
   */
  listRelatedItems = async (
    config: ListRelationshipsConfig,
    selectedFields?: (keyof TypeInfoDataItem)[],
  ): Promise<ListItemsResults<Partial<TypeInfoDataItem>>> => {
    return await this.makeRequest(TypeInfoORMAPIRoutePaths.LIST_RELATED_ITEMS, [
      config,
      selectedFields,
    ]);
  };
}
