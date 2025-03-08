import { TypeOperation } from "../../../../common/TypeParsing/TypeInfo";

export type OperationMode = Exclude<TypeOperation, TypeOperation.DELETE>;
export type UpdateOperationMode = TypeOperation.UPDATE;
export type NonUpdateOperationMode = Exclude<
  OperationMode,
  UpdateOperationMode
>;
