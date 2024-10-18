import { TypeInfoORMAPI } from "../../common/TypeInfoORM";
import { sendServiceRequest, ServiceConfig } from "./Service";

/**
 * A client for a TypeInfoORM API or service.
 * */
export class TypeInfoORMClient implements TypeInfoORMAPI {
  // TODO: Implement all methods.
  constructor(private config: ServiceConfig) {}

  protected makeRequest = async (path: string, args: any[]): Promise<any> => {
    const result = await sendServiceRequest(this.config, path, args);

    return result;
  };

  create = async (typeName: string, item: any): Promise<any> => {
    return null;
  };

  read = async (typeName: string, primaryFieldValue: any): Promise<any> => {
    return null;
  };

  update = async (typeName: string, item: any): Promise<boolean> => {
    return false;
  };

  delete = async (
    typeName: string,
    primaryFieldValue: any,
  ): Promise<boolean> => {
    return false;
  };

  list = async (typeName: string, config: any): Promise<boolean | any> => {
    return null;
  };

  createRelationship = async (relationshipItem: any): Promise<string> => {
    return "";
  };

  deletedRelationship = async (relationshipItem: any): Promise<boolean> => {
    return false;
  };

  listRelationships = async (config: any): Promise<boolean | any> => {
    return null;
  };

  cleanupRelationships = async (
    relationshipOriginatingItem: any,
  ): Promise<void> => {
    return null;
  };
}
