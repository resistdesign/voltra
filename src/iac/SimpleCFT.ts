/**
 * @packageDocumentation
 *
 * Fluent builder for CloudFormation templates. Use {@link SimpleCFT} to apply
 * packs, patches, and parameters, then read the resulting `template` or render
 * it as JSON/YAML.
 */
import { CloudFormationTemplate } from "./types/IaCTypes";
import {
  addParameter,
  addParameters,
  ParameterGroup,
  ParameterInfo,
  patchTemplate,
  ResourcePackApplier,
} from "./utils";
import YAML from "yaml";

/**
 * A function used to apply a modification to a SimpleCFT instance.
 *
 * @param simpleCFT - SimpleCFT instance to modify.
 * */
export type SimpleCFTModification = (simpleCFT: SimpleCFT) => void;

/**
 * The basis for your stack template.
 * Apply packs, patches, parameters and parameter groups.
 * Access the `template` property for the resulting CloudFormation template.
 *
 * Example:
 * ```ts
 * import { SimpleCFT } from "./SimpleCFT";
 *
 * const template = new SimpleCFT()
 *   .addParameter({
 *     Group: "App",
 *     ParameterId: "AppName",
 *     Label: "App Name",
 *     Parameter: { Type: "String", Default: "voltra" },
 *   })
 *   .patch({ Description: "My stack" });
 *
 * console.log(template.toString());
 * ```
 */
export class SimpleCFT {
  /**
   * Create a SimpleCFT template wrapper.
   *
   * @param template - Initial CloudFormation template.
   */
  constructor(
    public template: CloudFormationTemplate = {
      AWSTemplateFormatVersion: "2010-09-09",
    },
  ) {}

  /**
   * Apply a pack with configuration to the stack template.
   * @see {@link IaC} for an example.
   * */
  public applyPack = <ParamsType>(
    pack: ResourcePackApplier<ParamsType>,
    params: ParamsType,
  ) => {
    this.template = pack(params, this.template);

    return this;
  };

  /**
   * Apply a patch to the stack template.
   *
   * @param patch - Template patch to merge.
   * */
  public patch = (patch: Partial<CloudFormationTemplate>) => {
    this.template = patchTemplate(patch, this.template);

    return this;
  };

  /**
   * Add a stack parameter including its descriptive info and an optional parameter group.
   *
   * @param parameter - Parameter definition and metadata.
   * */
  public addParameter = (parameter: ParameterInfo) => {
    this.template = addParameter(parameter, this.template);

    return this;
  };

  /**
   * Add a group of stack parameters including their descriptive info and an optional parameter group.
   *
   * @param group - Parameter group definition.
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

  /**
   * Use a modification to dynamically apply various changes at once.
   *
   * @param modification - Modification callback to apply.
   * */
  public modify = (modification: SimpleCFTModification) => {
    modification(this);

    return this;
  };

  /**
   * Convert the stack template to a string.
   *
   * @returns JSON string representation of the template.
   * */
  public toString = () => JSON.stringify(this.template, null, 2);

  /**
   * Convert the stack template to a JSON object.
   *
   * @returns Template JSON object.
   * */
  public toJSON = () => this.template;

  /**
   * Convert the stack template to a YAML string.
   *
   * @returns YAML string representation of the template.
   * */
  public toYAML = () =>
    YAML.stringify(this.template, {
      aliasDuplicateObjects: false,
    });
}
