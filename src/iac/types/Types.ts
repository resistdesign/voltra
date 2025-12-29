/**
 * @packageDocumentation
 *
 * Core types used by the IaC type generator. The generated outputs live in
 * `src/iac/types/IaCTypes.ts` and `src/iac/types/CloudFormationResourceSpecification.ts`
 * and should not be edited by hand. Regenerate them via `yarn iac:types:gen`.
 */
export interface IDocumentable {
  UpdateType?: string;
  DuplicatesAllowed?: boolean;
  Documentation?: string;
}

export type AttributeType = {
  PrimitiveType?: string;
  Type?: string;
  ItemType?: string;
  PrimitiveItemType?: string;
  DuplicatesAllowed?: boolean;
};

export type PropertyDescriptor = IDocumentable &
  AttributeType & {
    Required?: boolean;
  };

export type PropertyType = PropertyDescriptor & {
  Properties?: Record<string, PropertyDescriptor>;
};

export type ResourceType = {
  Type?: string;
  Documentation?: string;
  AdditionalProperties?: boolean;
  Properties?: Record<string, PropertyDescriptor>;
  Attributes?: Record<string, AttributeType>;
};

export type CloudFormationResourceSpecification = {
  PropertyTypes: Record<string, PropertyType>;
  ResourceTypes: Record<string, ResourceType>;
  ResourceSpecificationVersion: `${number}.${number}.${number}`;
};

export type NamespaceStructure = {
  path: string[];
  includes?: string[];
  propertyTypes?: Record<string, PropertyType>;
  resourceTypes?: Record<string, ResourceType>;
  namespaces?: Record<string, NamespaceStructure>;
};
