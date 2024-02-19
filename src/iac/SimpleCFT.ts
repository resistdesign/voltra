import { CloudFormationTemplate } from "./types/StandardIncludes";
import {
  addParameter,
  addParameters,
  ParameterGroup,
  ParameterInfo,
  patchTemplate,
  ResourcePackApplier,
} from "./utils";

/**
 * The basis for your stack template.
 * Apply packs, patches, parameters and parameter groups.
 * Access the `template` property for the resulting CloudFormation template.
 * */
export class SimpleCFT {
  constructor(
    public template: CloudFormationTemplate = {
      AWSTemplateFormatVersion: "2010-09-09",
    },
  ) {}

  /**
   * Apply a pack with configuration to the stack template.
   * */
  public applyPack = <ParamsType>(
    params: ParamsType,
    pack: ResourcePackApplier<ParamsType>,
  ) => {
    this.template = pack(params, this.template);

    return this;
  };

  /**
   * Apply a patch to the stack template.
   * */
  public patch = (patch: Partial<CloudFormationTemplate>) => {
    this.template = patchTemplate(patch, this.template);

    return this;
  };

  /**
   * Add a stack parameter including its descriptive info and an optional parameter group.
   * */
  public addParameter = (parameter: ParameterInfo) => {
    this.template = addParameter(parameter, this.template);

    return this;
  };

  /**
   * Add a group of stack parameters including their descriptive info and an optional parameter group.
   * */
  public addParameterGroup = ({ Label: Group, Parameters }: ParameterGroup) => {
    const parameterIds = Object.keys(Parameters);
    const parameterList: ParameterInfo[] = parameterIds.map((ParameterId) => {
      const { Label, ...Parameter } = Parameters[ParameterId];

      return {
        Group,
        ParameterId,
        Label,
        Parameter,
      };
    });

    this.template = addParameters(parameterList, this.template);

    return this;
  };
}
