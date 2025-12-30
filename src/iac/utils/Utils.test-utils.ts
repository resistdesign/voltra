import { mergeValues } from "./patch-utils";
import { addParameter, addParameters, patchTemplate } from "./index";

export const runPatchUtilsScenario = () => {
  const mergeConfig = {
    "arr": { strategy: "accumulate" },
    "unique": { strategy: "accumulate-unique" },
    "by-id": { strategy: "accumulate-unique-by", data: "id" },
  } as const;

  const merged = mergeValues(
    [],
    {
      arr: [1, 2],
      unique: [1, 2],
      byId: [
        { id: "a", value: 1 },
        { id: "b", value: 2 },
      ],
      nested: {
        value: "old",
      },
    },
    {
      arr: [3],
      unique: [2, 3],
      byId: [
        { id: "b", value: 3 },
        { id: "c", value: 4 },
      ],
      nested: {
        extra: true,
      },
    },
    {
      "arr": mergeConfig.arr,
      "unique": mergeConfig.unique,
      "byId": mergeConfig["by-id"],
    },
  );

  const replaced = mergeValues(
    [],
    { value: 1 },
    { value: 2 },
    {
      "value": { strategy: "replace" },
    },
  );

  return {
    mergedArr: merged.arr,
    mergedUnique: merged.unique,
    mergedById: merged.byId,
    mergedNested: merged.nested,
    replacedValue: replaced.value,
  };
};

export const runIaCUtilsScenario = () => {
  const baseTemplate = {
    Parameters: {},
    Metadata: {},
  };
  const withParam = addParameter(
    {
      ParameterId: "Env",
      Label: "Environment",
      Parameter: {
        Type: "String",
      },
      Group: "Main",
    },
    baseTemplate as any,
  );
  const withParams = addParameters(
    [
      {
        ParameterId: "Region",
        Label: "Region",
        Parameter: {
          Type: "String",
        },
        Group: "Main",
      },
      {
        ParameterId: "Owner",
        Label: "Owner",
        Parameter: {
          Type: "String",
        },
        Group: "Extra",
      },
    ],
    withParam as any,
  );

  const patch = {
    Metadata: {
      "AWS::CloudFormation::Interface": {
        ParameterGroups: [
          {
            Label: { default: "Main" },
            Parameters: ["Env", "Region"],
          },
          {
            Label: { default: "Extra" },
            Parameters: ["Owner"],
          },
        ],
      },
    },
  };
  const patched = patchTemplate(patch, withParams as any);

  const interfaceMeta =
    patched.Metadata?.["AWS::CloudFormation::Interface"] || {};
  const { ParameterGroups = [], ParameterLabels = {} } = interfaceMeta;

  return {
    parameterKeys: Object.keys(patched.Parameters || {}).sort(),
    groupLabels: ParameterGroups.map((group: any) => group?.Label?.default),
    groupParameters: ParameterGroups.map((group: any) => group?.Parameters),
    envLabel: ParameterLabels.Env?.default,
    ownerLabel: ParameterLabels.Owner?.default,
  };
};
