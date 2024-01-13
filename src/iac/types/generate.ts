import Path from "path";
import FS from "fs";
import { format } from "prettier";
import { NamespaceStructure } from "./Types";
import { CloudFormationResourceSpecificationData } from "./CloudFormationResourceSpecification";
import { getNamespaceStructure } from "./Utils";
import { renderNamespaceStructure } from "./Renderers";

const STANDARD_INCLUDES = FS.readFileSync(
  Path.join(__dirname, "StandardIncludes.d.ts"),
  { encoding: "utf8" },
)
  // IMPORTANT: Remove the first line which is a placeholder for the `AllResourceTypes` type.
  .replace(/.*/, "")
  .trimStart();

const BASE_NAMESPACE_STRUCTURE: NamespaceStructure = {
  path: [],
  includes: [STANDARD_INCLUDES],
  propertyTypes: {},
  resourceTypes: {},
  namespaces: {},
};

const NamespaceStructure: NamespaceStructure = getNamespaceStructure(
  CloudFormationResourceSpecificationData,
  BASE_NAMESPACE_STRUCTURE,
);

const generate = async () => {
  const TypesContentString = await format(
    renderNamespaceStructure(NamespaceStructure),
    {
      parser: "typescript",
    },
  );

  // TODO: Types should be broken up into separate files.
  FS.mkdirSync(Path.join(__dirname, "..", "dist"), { recursive: true });
  FS.writeFileSync(
    Path.join(__dirname, "..", "dist", "index.d.ts"),
    TypesContentString,
    { encoding: "utf8" },
  );
};

generate();
