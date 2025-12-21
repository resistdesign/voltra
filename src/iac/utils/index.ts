import {
  CloudFormationParameter,
  CloudFormationTemplate,
} from "../types/IaCTypes";
import { getValuePathString, mergeValues } from "./patch-utils";

export * from "./patch-utils";

export type ParameterInfo = {
  ParameterId: string;
  Parameter: CloudFormationParameter;
  Label: string;
  Group?: string;
};

/**
 * Add a stack parameter including its descriptive info and an optional parameter group.
 * */
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
 * */
export const addParameters = (
  parameters: ParameterInfo[],
  template: CloudFormationTemplate,
) => parameters.reduce((acc, p) => addParameter(p, acc), template);

/**
 * A function used to apply a pack to a stack template.
 * */
export type ResourcePackApplier<ParamsType> = (
  params: ParamsType,
  template: CloudFormationTemplate,
) => CloudFormationTemplate;

/**
 * Apply a patch to a stack template.
 * */
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
 * */
export const createResourcePack =
  <ParamsType>(
    creator: (params: ParamsType) => Partial<CloudFormationTemplate>,
  ): ResourcePackApplier<ParamsType> =>
  (params: ParamsType, template: CloudFormationTemplate) => {
    const patch = creator(params);

    return patchTemplate(patch, template);
  };

export type ParameterGroup = {
  Label: string;
  Parameters: {
    [parameterId: string]: { Label: string } & CloudFormationParameter;
  };
};
