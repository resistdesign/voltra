import { AttributeType, IDocumentable, NamespaceStructure, PropertyDescriptor, PropertyType, ResourceType } from './Types';
import { CONTAINER_TYPES, NAMESPACE_DELIMITERS, NEVER_TYPE, PRIMITIVE_TYPE_MAP, TAG_TYPE } from './Constants';

export const renderPrimitiveType = (primitiveType: string) =>
  primitiveType in PRIMITIVE_TYPE_MAP ? `CloudFormationPrimitiveValue<${PRIMITIVE_TYPE_MAP[primitiveType]}>` : primitiveType;

export const renderPropertyType = (path: string[], { PrimitiveType, Type, PrimitiveItemType, ItemType }: AttributeType) => {
  if (PrimitiveType) {
    return renderPrimitiveType(PrimitiveType);
  } else if (Type && CONTAINER_TYPES.indexOf(Type) !== -1) {
    const resolvedItemType = PrimitiveItemType
      ? renderPrimitiveType(PrimitiveItemType)
      : ItemType === TAG_TYPE
      ? TAG_TYPE
      : [...path, ItemType].join(NAMESPACE_DELIMITERS.OUTPUT);

    return Type === 'List' ? `${resolvedItemType}[]` : `Record<string, ${resolvedItemType}>`;
  } else if (Type === TAG_TYPE) {
    return TAG_TYPE;
  } else if (Type) {
    return [...path, Type].join(NAMESPACE_DELIMITERS.OUTPUT);
  } else {
    return NEVER_TYPE;
  }
};

export const renderPropertyName = (propertyName: string, descriptor: PropertyDescriptor | AttributeType) => {
  const cleanPropertyName = propertyName && propertyName.indexOf('.') !== -1 ? `'${propertyName}'` : propertyName;

  if ('Required' in descriptor) {
    const { Required } = descriptor;

    return `${cleanPropertyName}${Required ? '' : '?'}`;
  } else {
    return cleanPropertyName;
  }
};

export const renderCommentBlock = ({ UpdateType, DuplicatesAllowed = false, Documentation }: IDocumentable) =>
  UpdateType || DuplicatesAllowed || Documentation
    ? `/**${
        UpdateType
          ? `
 * Update Type: ${UpdateType}`
          : ''
      }${
        DuplicatesAllowed
          ? `
 * Duplicates Allowed: Yes`
          : ''
      }${
        Documentation
          ? `
 * @see ${Documentation}`
          : ''
      }
 * */
`
    : '';

export const renderProperty = (path: string[], propertyName: string, propertyDescriptor: PropertyDescriptor | AttributeType) =>
  `${renderCommentBlock(propertyDescriptor)}${renderPropertyName(propertyName, propertyDescriptor)}: ${renderPropertyType(
    path,
    propertyDescriptor
  )};`;

export const renderTypeWithFullBody = (commentBlock: string, typeName: string, fullBody: string) =>
  `${commentBlock}export type ${typeName} = ${fullBody};`;

export const renderTypePropertiesBody = (path: string[], properties: Record<string, PropertyDescriptor | AttributeType>) => {
  const propertyKeys = Object.keys(properties);

  return `{
${propertyKeys.map((pK) => renderProperty(path, pK, properties[pK])).join('\n')}
}`;
};

export const renderTypeWithProperties = (path: string[], typeName: string, properties: Record<string, AttributeType>, commentBlock: string = '') => {
  return renderTypeWithFullBody(commentBlock, typeName, renderTypePropertiesBody(path, properties));
};

export const renderTypeFromPropertyType = (path: string[], typeName: string, propertyType: PropertyType) => {
  const { Properties } = propertyType;
  const commentBlock = renderCommentBlock(propertyType);

  if (Properties) {
    return renderTypeWithProperties(path, typeName, Properties, commentBlock);
  } else {
    return `${commentBlock}export type ${typeName} = ${renderPropertyType(path, propertyType)}`;
  }
};

export const renderTypeFromResourceType = (path: string[], typeName: string, resourceType: ResourceType) => {
  const { Type, Properties, Attributes } = resourceType;
  const commentBlock = renderCommentBlock(resourceType);
  const subPath = [...path, typeName];

  return renderTypeWithFullBody(
    commentBlock,
    typeName,
    `CloudFormationResource<'${Type}', ${Attributes ? renderTypePropertiesBody(subPath, Attributes) : NEVER_TYPE}, ${
      Properties ? renderTypePropertiesBody(subPath, Properties) : NEVER_TYPE
    }>`
  );
};

export const renderNamespaceStructure = (
  { path = [], includes = [], propertyTypes = {}, resourceTypes = {}, namespaces = {} }: NamespaceStructure,
  namespaceName?: string
) => {
  const namespaceBody: string = `${includes?.join('\n')}

${Object.keys(propertyTypes)
  .map((pT) => renderTypeFromPropertyType(path, pT, propertyTypes[pT]))
  .join('\n')}

${Object.keys(resourceTypes)
  .map((rT) => renderTypeFromResourceType(path, rT, resourceTypes[rT]))
  .join('\n')}

${Object.keys(namespaces)
  .map((ns) => renderNamespaceStructure(namespaces[ns], ns))
  .join('\n')}`;

  if (namespaceName) {
    return `export namespace ${namespaceName} {
${namespaceBody}
}`;
  } else {
    return namespaceBody;
  }
};
