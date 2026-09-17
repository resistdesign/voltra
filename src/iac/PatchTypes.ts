import {
  AllResourceTypes,
  CloudFormationTemplate,
} from "./types/IaCTypes";

type DeepPartial<T> = T extends (...args: any[]) => any
  ? T
  : T extends readonly unknown[]
    ? { [Key in keyof T]: DeepPartial<T[Key]> }
    : T extends object
      ? { [Key in keyof T]?: DeepPartial<T[Key]> }
      : T;

type CloudFormationResourcePatch = DeepPartial<AllResourceTypes>;

export type CloudFormationTemplatePatch = Omit<
  Partial<CloudFormationTemplate>,
  "Resources"
> & {
  Resources?: Record<string, CloudFormationResourcePatch>;
};
