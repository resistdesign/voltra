import {
  TypeInfoORMAPI,
  TypeInfoORMAPIRoutePaths,
} from "../../common/TypeInfoORM";
import { sendServiceRequest, ServiceConfig } from "./Service";
import { TypeInfoDataItem } from "../../common/TypeParsing/TypeInfo";
import {
  BaseItemRelationshipInfo,
  ItemRelationshipInfo,
  ItemRelationshipOriginatingItemInfo,
  ListItemsConfig,
  ListItemsResults,
  ListRelationshipsConfig,
} from "../../common";

/**
 * A client for a TypeInfoORM API or service.
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
  ): Promise<boolean | ListItemsResults<TypeInfoDataItem>> => {
    return await this.makeRequest(TypeInfoORMAPIRoutePaths.LIST, [
      typeName,
      config,
    ]);
  };

  createRelationship = async (
    relationshipItem: BaseItemRelationshipInfo,
  ): Promise<string> => {
    return await this.makeRequest(
      TypeInfoORMAPIRoutePaths.CREATE_RELATIONSHIP,
      [relationshipItem],
    );
  };

  deletedRelationship = async (
    relationshipItem: BaseItemRelationshipInfo,
  ): Promise<boolean> => {
    return await this.makeRequest(
      TypeInfoORMAPIRoutePaths.DELETE_RELATIONSHIP,
      [relationshipItem],
    );
  };

  listRelationships = async (
    config: ListRelationshipsConfig,
  ): Promise<boolean | ListItemsResults<ItemRelationshipInfo>> => {
    return await this.makeRequest(TypeInfoORMAPIRoutePaths.LIST_RELATIONSHIPS, [
      config,
    ]);
  };

  cleanupRelationships = async (
    relationshipOriginatingItem: ItemRelationshipOriginatingItemInfo,
  ): Promise<void> => {
    return await this.makeRequest(
      TypeInfoORMAPIRoutePaths.CLEANUP_RELATIONSHIPS,
      [relationshipOriginatingItem],
    );
  };
}
