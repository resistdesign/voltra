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
  constructor(private config: ServiceConfig) {}

  protected makeRequest = async (
    path: TypeInfoORMAPIRoutePaths,
    args: any[],
  ): Promise<any> => {
    const result = await sendServiceRequest(this.config, path, args);

    return result;
  };

  create = async (typeName: string, item: TypeInfoDataItem): Promise<any> => {
    return await this.makeRequest(TypeInfoORMAPIRoutePaths.CREATE, [
      typeName,
      item,
    ]);
  };

  read = async (
    typeName: string,
    primaryFieldValue: any,
  ): Promise<TypeInfoDataItem> => {
    return await this.makeRequest(TypeInfoORMAPIRoutePaths.READ, [
      typeName,
      primaryFieldValue,
    ]);
  };

  update = async (
    typeName: string,
    item: TypeInfoDataItem,
  ): Promise<boolean> => {
    return await this.makeRequest(TypeInfoORMAPIRoutePaths.UPDATE, [
      typeName,
      item,
    ]);
  };

  delete = async (
    typeName: string,
    primaryFieldValue: any,
  ): Promise<boolean> => {
    return await this.makeRequest(TypeInfoORMAPIRoutePaths.DELETE, [
      typeName,
      primaryFieldValue,
    ]);
  };

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

  createRelationship = async (
    relationshipItem: BaseItemRelationshipInfo,
  ): Promise<boolean> => {
    return await this.makeRequest(
      TypeInfoORMAPIRoutePaths.CREATE_RELATIONSHIP,
      [relationshipItem],
    );
  };

  deleteRelationship = async (
    relationshipItem: BaseItemRelationshipInfo,
  ): Promise<DeleteRelationshipResults> => {
    return await this.makeRequest(
      TypeInfoORMAPIRoutePaths.DELETE_RELATIONSHIP,
      [relationshipItem],
    );
  };

  listRelationships = async (
    config: ListRelationshipsConfig,
  ): Promise<ListItemsResults<ItemRelationshipInfo>> => {
    return await this.makeRequest(TypeInfoORMAPIRoutePaths.LIST_RELATIONSHIPS, [
      config,
    ]);
  };

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
