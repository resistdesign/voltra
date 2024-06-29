import { FieldInfo } from "aws-sdk/clients/configservice";
import { TypeInfo, TypeInfoMap } from "../../../common/TypeParsing/TypeInfo";

export type InputProps<ElementType> = ElementType & {
  typeInfoMap: TypeInfoMap;
  typeInfo: TypeInfo;
  fieldInfo: FieldInfo;
  index?: number;
  options?: any[];
  value: any;
  onChange: (value: any) => void;
  onNavigate: (path: string) => void;
  onOptionsSearch: (query: any) => void;
};
