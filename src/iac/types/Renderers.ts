/**
 * Render helpers that convert CloudFormation spec nodes into TypeScript types.
 */
import {
  AttributeType,
  IDocumentable,
  NamespaceStructure,
  PropertyDescriptor,
  PropertyType,
  ResourceType,
} from "./Types";
import {
  CONTAINER_TYPES,
  NAMESPACE_DELIMITERS,
  NEVER_TYPE,
  PRIMITIVE_TYPE_MAP,
  TAG_TYPE,
} from "./Constants";

/**
 * Render a primitive CloudFormation type to a TypeScript type string.
 *
 * @param primitiveType - CloudFormation primitive type name.
 * @returns Rendered TypeScript type string.
 */
export const renderPrimitiveType = (primitiveType: string) =>
  primitiveType in PRIMITIVE_TYPE_MAP
    ? `CloudFormationPrimitiveValue<${PRIMITIVE_TYPE_MAP[primitiveType]}>`
    : primitiveType;

/**
 * Render a property type from an attribute descriptor.
 *
 * @param path - Namespace path segments.
 * @param attribute - Attribute type descriptor.
 * @returns Rendered TypeScript type string.
 */
export const renderPropertyType = (
  path: string[],
  { PrimitiveType, Type, PrimitiveItemType, ItemType }: AttributeType,
) => {
  if (PrimitiveType) {
    return renderPrimitiveType(PrimitiveType);
  } else if (Type && CONTAINER_TYPES.indexOf(Type) !== -1) {
    const resolvedItemType = PrimitiveItemType
      ? renderPrimitiveType(PrimitiveItemType)
      : ItemType === TAG_TYPE
        ? TAG_TYPE
        : [...path, ItemType].join(NAMESPACE_DELIMITERS.OUTPUT);

    return Type === "List"
      ? `${resolvedItemType}[]`
      : `Record<string, ${resolvedItemType}>`;
  } else if (Type === TAG_TYPE) {
    return TAG_TYPE;
  } else if (Type) {
    return [...path, Type].join(NAMESPACE_DELIMITERS.OUTPUT);
  } else {
    return NEVER_TYPE;
  }
};

/**
 * Render a property name with optionality.
 *
 * @param propertyName - Property name from the spec.
 * @param descriptor - Property descriptor or attribute type.
 * @returns Rendered property name string.
 */
export const renderPropertyName = (
  propertyName: string,
  descriptor: PropertyDescriptor | AttributeType,
) => {
  const cleanPropertyName =
    propertyName && propertyName.indexOf(".") !== -1
      ? `'${propertyName}'`
      : propertyName;

  if ("Required" in descriptor) {
    const { Required } = descriptor;

    return `${cleanPropertyName}${Required ? "" : "?"}`;
  } else {
    return cleanPropertyName;
  }
};

/**
 * Render a JSDoc comment block from a documentable descriptor.
 *
 * @param descriptor - Documentable spec node.
 * @returns Comment block string or empty string.
 */
export const renderCommentBlock = ({
  UpdateType,
  DuplicatesAllowed = false,
  Documentation,
}: IDocumentable) =>
  UpdateType || DuplicatesAllowed || Documentation
    ? `/**${
        UpdateType
          ? `
 * Update Type: ${UpdateType}`
          : ""
      }${
        DuplicatesAllowed
          ? `
 * Duplicates Allowed: Yes`
          : ""
      }${
        Documentation
          ? `
 * @see ${Documentation}`
          : ""
      }
 * */
`
    : "";

/**
 * Render a property line for a type.
 *
 * @param path - Namespace path segments.
 * @param propertyName - Property name.
 * @param propertyDescriptor - Property descriptor or attribute type.
 * @returns Rendered property line.
 */
export const renderProperty = (
  path: string[],
  propertyName: string,
  propertyDescriptor: PropertyDescriptor | AttributeType,
) =>
  `${renderCommentBlock(propertyDescriptor)}${renderPropertyName(
    propertyName,
    propertyDescriptor,
  )}: ${renderPropertyType(path, propertyDescriptor)};`;

/**
 * Render a type alias with a fully formed body.
 *
 * @param commentBlock - Optional comment block.
 * @param typeName - Type name.
 * @param fullBody - Type body string.
 * @returns Rendered type alias string.
 */
export const renderTypeWithFullBody = (
  commentBlock: string,
  typeName: string,
  fullBody: string,
) => `${commentBlock}export type ${typeName} = ${fullBody};`;

/**
 * Render a type body with property definitions.
 *
 * @param path - Namespace path segments.
 * @param properties - Properties to render.
 * @returns Rendered type body string.
 */
export const renderTypePropertiesBody = (
  path: string[],
  properties: Record<string, PropertyDescriptor | AttributeType>,
) => {
  const propertyKeys = Object.keys(properties);

  return `{
${propertyKeys.map((pK) => renderProperty(path, pK, properties[pK])).join("\n")}
}`;
};

/**
 * Render a type alias from a property map.
 *
 * @param path - Namespace path segments.
 * @param typeName - Type name.
 * @param properties - Property definitions.
 * @param commentBlock - Optional comment block.
 * @returns Rendered type alias string.
 */
export const renderTypeWithProperties = (
  path: string[],
  typeName: string,
  properties: Record<string, AttributeType>,
  commentBlock: string = "",
) => {
  return renderTypeWithFullBody(
    commentBlock,
    typeName,
    renderTypePropertiesBody(path, properties),
  );
};

/**
 * Render a type alias from a property type.
 *
 * @param path - Namespace path segments.
 * @param typeName - Type name.
 * @param propertyType - Property type descriptor.
 * @returns Rendered type alias string.
 */
export const renderTypeFromPropertyType = (
  path: string[],
  typeName: string,
  propertyType: PropertyType,
) => {
  const { Properties } = propertyType;
  const commentBlock = renderCommentBlock(propertyType);

  if (Properties) {
    return renderTypeWithProperties(path, typeName, Properties, commentBlock);
  } else {
    return `${commentBlock}export type ${typeName} = ${renderPropertyType(path, propertyType)}`;
  }
};

/**
 * Render a type alias for a resource type.
 *
 * @param path - Namespace path segments.
 * @param typeName - Type name.
 * @param resourceType - Resource type descriptor.
 * @returns Rendered type alias string.
 */
export const renderTypeFromResourceType = (
  path: string[],
  typeName: string,
  resourceType: ResourceType,
) => {
  const { Type, Properties, Attributes } = resourceType;
  const commentBlock = renderCommentBlock(resourceType);
  const subPath = [...path, typeName];

  return renderTypeWithFullBody(
    commentBlock,
    typeName,
    `CloudFormationResource<'${Type}', ${
      Attributes ? renderTypePropertiesBody(subPath, Attributes) : NEVER_TYPE
    }, ${Properties ? renderTypePropertiesBody(subPath, Properties) : NEVER_TYPE}>`,
  );
};

/**
 * Render a namespace structure into TypeScript type output.
 *
 * @param structure - Namespace structure to render.
 * @param namespaceName - Optional namespace name.
 * @returns Rendered namespace string.
 */
export const renderNamespaceStructure = (
  {
    path = [],
    includes = [],
    propertyTypes = {},
    resourceTypes = {},
    namespaces = {},
  }: NamespaceStructure,
  namespaceName?: string,
) => {
  const namespaceBody: string = `${includes?.join("\n")}

${Object.keys(propertyTypes)
  .map((pT) => renderTypeFromPropertyType(path, pT, propertyTypes[pT]))
  .join("\n")}

${Object.keys(resourceTypes)
  .map((rT) => renderTypeFromResourceType(path, rT, resourceTypes[rT]))
  .join("\n")}

${Object.keys(namespaces)
  .map((ns) => renderNamespaceStructure(namespaces[ns], ns))
  .join("\n")}`;

  if (namespaceName) {
    return `export namespace ${namespaceName} {
${namespaceBody}
}`;
  } else {
    return namespaceBody;
  }
};
