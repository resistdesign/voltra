/**
 * @packageDocumentation
 *
 * IaC utility helpers for patching templates, creating resource packs, and
 * defining parameter groups.
 */
import {
  CloudFormationParameter,
  CloudFormationTemplate,
} from "../types/IaCTypes";
import { getValuePathString, mergeValues } from "./patch-utils";

export * from "./patch-utils";

/**
 * Stack parameter definition with display metadata.
 */
export type ParameterInfo = {
  /**
   * Parameter id used in the template.
   */
  ParameterId: string;
  /**
   * CloudFormation parameter definition.
   */
  Parameter: CloudFormationParameter;
  /**
   * Display label for the parameter.
   */
  Label: string;
  /**
   * Optional parameter group label.
   */
  Group?: string;
};

/**
 * Add a stack parameter including its descriptive info and an optional parameter group.
 *
 * @param parameterInfo - Parameter metadata and definition.
 * @param template - Template to update.
 * @returns Updated CloudFormation template.
 */
export const addParameter = (
  parameterInfo: ParameterInfo,
  template: CloudFormationTemplate,
): CloudFormationTemplate => {
  const { ParameterId, Parameter, Label, Group } = parameterInfo;
  const {
    Parameters,
    Metadata: {
      "AWS::CloudFormation::Interface": {
        ParameterGroups = [],
        ParameterLabels = {},
      } = {},
    } = {},
  } = template;

  let NewParameterGroups = ParameterGroups;

  if (Group) {
    const GroupObject = ParameterGroups.filter(
      (g) => g.Label?.default === Group,
    )[0];

    NewParameterGroups = GroupObject
      ? ParameterGroups.map((g) =>
          g.Label?.default === Group
            ? {
                ...g,
                Parameters: [...(g.Parameters || []), ParameterId],
              }
            : g,
        )
      : [
          ...ParameterGroups,
          {
            Label: {
              default: Group,
            },
            Parameters: [ParameterId],
          },
        ];
  }

  return {
    ...template,
    Parameters: {
      ...Parameters,
      [ParameterId]: Parameter,
    },
    Metadata: {
      ...template.Metadata,
      "AWS::CloudFormation::Interface": {
        ...template?.Metadata?.["AWS::CloudFormation::Interface"],
        ParameterGroups: NewParameterGroups,
        ParameterLabels: {
          ...ParameterLabels,
          [ParameterId]: {
            default: Label,
          },
        },
      },
    },
  };
};

/**
 * Add multiple stack parameters with info and groups.
 *
 * @param parameters - Parameter definitions to add.
 * @param template - Template to update.
 * @returns Updated CloudFormation template.
 */
export const addParameters = (
  parameters: ParameterInfo[],
  template: CloudFormationTemplate,
) => parameters.reduce((acc, p) => addParameter(p, acc), template);

/**
 * A function used to apply a pack to a stack template.
 *
 * @typeParam ParamsType - Pack parameter type.
 * @param params - Pack configuration.
 * @param template - Template to update.
 * @returns Updated CloudFormation template.
 */
export type ResourcePackApplier<ParamsType> = (
  params: ParamsType,
  template: CloudFormationTemplate,
) => CloudFormationTemplate;

/**
 * Apply a patch to a stack template.
 *
 * @param patch - Partial template patch.
 * @param template - Template to update.
 * @returns Updated CloudFormation template.
 */
export const patchTemplate = (
  patch: Partial<CloudFormationTemplate>,
  template: CloudFormationTemplate,
): CloudFormationTemplate =>
  mergeValues([], template, patch, {
    [getValuePathString([
      // Parameter Groups
      "Metadata",
      "AWS::CloudFormation::Interface",
      "ParameterGroups",
    ])]: {
      strategy: "accumulate-unique-by",
      data: (pG) => pG?.Label?.default,
    },
    [getValuePathString([
      // Parameter Group Parameter Ids
      "Metadata",
      "AWS::CloudFormation::Interface",
      "ParameterGroups",
      "#",
      "Parameters",
    ])]: {
      strategy: "accumulate-unique",
    },
  });

/**
 * Create a custom resource pack that can use configuration input to patch a stack with convenient resources, parameters, etc.
 *
 * @typeParam ParamsType - Pack parameter type.
 * @param creator - Pack creator that returns a template patch.
 * @returns Resource pack applier.
 */
export const createResourcePack =
  <ParamsType>(
    creator: (params: ParamsType) => Partial<CloudFormationTemplate>,
  ): ResourcePackApplier<ParamsType> =>
  (params: ParamsType, template: CloudFormationTemplate) => {
    const patch = creator(params);

    return patchTemplate(patch, template);
  };

/**
 * Grouped parameter definitions for CloudFormation interfaces.
 */
export type ParameterGroup = {
  /**
   * Group label.
   */
  Label: string;
  /**
   * Map of parameter ids to parameter definitions.
   */
  Parameters: {
    [parameterId: string]: { Label: string } & CloudFormationParameter;
  };
};
