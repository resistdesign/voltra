import { SimpleCFT } from "./SimpleCFT";
import { createResourcePack, ParameterGroup } from "./utils";
import YAML from "yaml";

export const runSimpleCFTScenario = () => {
  const simpleCFT = new SimpleCFT();
  const pack = createResourcePack(
    (params: { typeName: string }) =>
      ({
        Resources: {
          SampleResource: {
            Type: params.typeName,
          },
        },
      }) as any,
  );

  simpleCFT.applyPack(pack, { typeName: "Custom::Thing" });
  simpleCFT.patch({ Description: "Voltra stack" });

  simpleCFT.addParameter({
    ParameterId: "Env",
    Label: "Environment",
    Parameter: {
      Type: "String",
    },
    Group: "Main",
  });

  const extraGroup: ParameterGroup = {
    Label: "Extra",
    Parameters: {
      Region: {
        Label: "Region",
        Type: "String",
      },
    },
  };

  simpleCFT.addParameterGroup(extraGroup);

  simpleCFT.modify((instance) => {
    instance.patch({
      Metadata: {
        Owner: "Voltra",
      },
    });
  });

  const json = simpleCFT.toJSON();
  const jsonString = simpleCFT.toString();
  const yamlParsed = YAML.parse(simpleCFT.toYAML());

  return {
    template: json,
    stringMatches: jsonString === JSON.stringify(json, null, 2),
    yamlMatches: JSON.stringify(yamlParsed) === JSON.stringify(json),
  };
};
