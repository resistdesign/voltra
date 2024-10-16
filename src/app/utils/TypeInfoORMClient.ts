import { TypeInfoORMAPI } from "../../common/TypeInfoORM";

/**
 * The configuration for the TypeInfoORM client.
 * */
export type TypeInfoORMClientConfig = {
  baseURL: string;
  authorization?: string;
};

/**
 * A client for a TypeInfoORM API or service.
 * */
export class TypeInfoORMClient implements TypeInfoORMAPI {
  // TODO: Implement all methods.
  constructor(private config: TypeInfoORMClientConfig) {}

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
