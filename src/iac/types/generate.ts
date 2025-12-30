/**
 * Generate IaC TypeScript types from the CloudFormation resource specification.
 *
 * Workflow:
 * - Update `CloudFormationResourceSpecification.ts` with the latest AWS JSON.
 * - Run `yarn iac:types:gen` to produce `dist/IaCTypes.ts`.
 */
import Path from "path";
import FS from "fs";
import { format } from "prettier";
import { NamespaceStructure } from "./Types";
import { CloudFormationResourceSpecificationData } from "./CloudFormationResourceSpecification";
import { getNamespaceStructure } from "./Utils";
import { renderNamespaceStructure } from "./Renderers";

const STANDARD_INCLUDES = FS.readFileSync(
  Path.join(__dirname, "StandardIncludes.d.ts.tmpl"),
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

  FS.mkdirSync(Path.join(__dirname, "..", "dist"), { recursive: true });
  FS.writeFileSync(
    Path.join(__dirname, "..", "dist", "IaCTypes.ts"),
    TypesContentString,
    { encoding: "utf8" },
  );
};

generate();
