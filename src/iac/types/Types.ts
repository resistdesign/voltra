/**
 * @packageDocumentation
 *
 * Core types used by the IaC type generator. The generated outputs live in
 * `src/iac/types/IaCTypes.ts` and `src/iac/types/CloudFormationResourceSpecification.ts`
 * and should not be edited by hand. Regenerate them via `yarn iac:types:gen`.
 */
export interface IDocumentable {
  /**
   * Update type description from the spec.
   */
  UpdateType?: string;
  /**
   * Whether duplicates are allowed.
   */
  DuplicatesAllowed?: boolean;
  /**
   * Documentation URL for the spec entry.
   */
  Documentation?: string;
}

export type AttributeType = {
  /**
   * Primitive type name, when applicable.
   */
  PrimitiveType?: string;
  /**
   * Container or complex type name.
   */
  Type?: string;
  /**
   * Item type for container types.
   */
  ItemType?: string;
  /**
   * Primitive item type for container types.
   */
  PrimitiveItemType?: string;
  /**
   * Whether duplicate items are allowed.
   */
  DuplicatesAllowed?: boolean;
};

export type PropertyDescriptor = IDocumentable &
  AttributeType & {
    /**
     * Whether the property is required.
     */
    Required?: boolean;
  };

export type PropertyType = PropertyDescriptor & {
  /**
   * Child properties for object types.
   */
  Properties?: Record<string, PropertyDescriptor>;
};

export type ResourceType = {
  /**
   * CloudFormation resource type name.
   */
  Type?: string;
  /**
   * Documentation URL for the resource type.
   */
  Documentation?: string;
  /**
   * Whether additional properties are allowed.
   */
  AdditionalProperties?: boolean;
  /**
   * Resource properties map.
   */
  Properties?: Record<string, PropertyDescriptor>;
  /**
   * Resource attributes map.
   */
  Attributes?: Record<string, AttributeType>;
};

export type CloudFormationResourceSpecification = {
  /**
   * Map of property types keyed by name.
   */
  PropertyTypes: Record<string, PropertyType>;
  /**
   * Map of resource types keyed by name.
   */
  ResourceTypes: Record<string, ResourceType>;
  /**
   * Specification version string.
   */
  ResourceSpecificationVersion: `${number}.${number}.${number}`;
};

export type NamespaceStructure = {
  /**
   * Namespace path segments.
   */
  path: string[];
  /**
   * TypeScript include strings for the namespace.
   */
  includes?: string[];
  /**
   * Property types contained in the namespace.
   */
  propertyTypes?: Record<string, PropertyType>;
  /**
   * Resource types contained in the namespace.
   */
  resourceTypes?: Record<string, ResourceType>;
  /**
   * Nested namespaces.
   */
  namespaces?: Record<string, NamespaceStructure>;
};
