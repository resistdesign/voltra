import { FieldInfo } from "aws-sdk/clients/configservice";
import { TypeInfoMap } from "../../../common/TypeParsing/TypeInfo";

export type InputProps<ElementType> = ElementType & {
  typeInfoMap: TypeInfoMap;
  fieldInfo: FieldInfo;
  value: any;
  onChange: (value: any) => void;
  onNavigate: (path: string) => void;
};
