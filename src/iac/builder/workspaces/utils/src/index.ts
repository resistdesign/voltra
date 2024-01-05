import { CloudFormationParameter, CloudFormationTemplate } from '@aws-cf-builder/types';
import { getValuePathString, mergeValues } from './patch-utils';

export type ParameterInfo = {
  ParameterId: string;
  Parameter: CloudFormationParameter;
  Label: string;
  Group?: string;
};

export const addParameter = (parameterInfo: ParameterInfo, template: CloudFormationTemplate): CloudFormationTemplate => {
  const { ParameterId, Parameter, Label, Group } = parameterInfo;
  const { Parameters, Metadata: { 'AWS::CloudFormation::Interface': { ParameterGroups = [], ParameterLabels = {} } = {} } = {} } = template;

  let NewParameterGroups = ParameterGroups;

  if (Group) {
    const GroupObject = ParameterGroups.filter((g) => g.Label?.default === Group)[0];

    NewParameterGroups = GroupObject
      ? ParameterGroups.map((g) =>
          g.Label?.default === Group
            ? {
                ...g,
                Parameters: [...(g.Parameters || []), ParameterId],
              }
            : g
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
      'AWS::CloudFormation::Interface': {
        ...template?.Metadata?.['AWS::CloudFormation::Interface'],
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

export const addParameters = (parameters: ParameterInfo[], template: CloudFormationTemplate) =>
  parameters.reduce((acc, p) => addParameter(p, acc), template);

export type ResourcePackApplier<ParamsType> = (params: ParamsType, template: CloudFormationTemplate) => CloudFormationTemplate;

export const patchTemplate = (patch: Partial<CloudFormationTemplate>, template: CloudFormationTemplate): CloudFormationTemplate =>
  mergeValues([], template, patch, {
    [getValuePathString([
      // Parameter Groups
      'Metadata',
      'AWS::CloudFormation::Interface',
      'ParameterGroups',
    ])]: {
      strategy: 'accumulate-unique-by',
      data: (pG) => pG?.Label?.default,
    },
    [getValuePathString([
      // Parameter Group Parameter Ids
      'Metadata',
      'AWS::CloudFormation::Interface',
      'ParameterGroups',
      '#',
      'Parameters',
    ])]: {
      strategy: 'accumulate-unique',
    },
  });

export const createResourcePack =
  <ParamsType>(creator: (params: ParamsType) => Partial<CloudFormationTemplate>): ResourcePackApplier<ParamsType> =>
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

export class SimpleCFT {
  constructor(public template: CloudFormationTemplate = { AWSTemplateFormatVersion: '2010-09-09' }) {}

  public applyPack = <ParamsType>(params: ParamsType, pack: ResourcePackApplier<ParamsType>) => {
    this.template = pack(params, this.template);

    return this;
  };

  public patch = (patch: Partial<CloudFormationTemplate>) => {
    this.template = patchTemplate(patch, this.template);

    return this;
  };

  public addParameter = (parameter: ParameterInfo) => {
    this.template = addParameter(parameter, this.template);

    return this;
  };

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
