import { CloudFormationResourceSpecification, NamespaceStructure, PropertyType, ResourceType } from './Types';
import { NAMESPACE_DELIMITERS } from './Constants';

export const getNamespaceStructure = (specification: CloudFormationResourceSpecification, baseStructure: NamespaceStructure): NamespaceStructure => {
  const newStructure: NamespaceStructure = {
    ...baseStructure,
  };
  const { PropertyTypes, ResourceTypes } = specification;
  const propertyTypesKeys = Object.keys(PropertyTypes);
  const resourceTypesKeys = Object.keys(ResourceTypes);
  const resourceTypeOptions = [];

  for (const pTK of propertyTypesKeys) {
    const fullPropertyTypeNameParts = pTK
      .replace(NAMESPACE_DELIMITERS.INPUT_REGEX, () => NAMESPACE_DELIMITERS.OUTPUT)
      .split(NAMESPACE_DELIMITERS.OUTPUT);
    const propType: PropertyType = PropertyTypes[pTK];
    const currentPath: string[] = [];

    let targetNamespace: NamespaceStructure = newStructure;

    for (let i = 0; i < fullPropertyTypeNameParts.length; i++) {
      const part = fullPropertyTypeNameParts[i];

      currentPath.push(part);

      if (i === fullPropertyTypeNameParts.length - 1) {
        targetNamespace.propertyTypes = targetNamespace.propertyTypes || {};
        targetNamespace.propertyTypes[part] = propType;
      } else {
        targetNamespace.namespaces = targetNamespace.namespaces || {};
        targetNamespace.namespaces[part] = targetNamespace.namespaces[part] || { path: [...currentPath] };
        targetNamespace = targetNamespace.namespaces[part];
      }
    }
  }

  for (const rTK of resourceTypesKeys) {
    const fullResourceTypeNameParts = rTK.split(NAMESPACE_DELIMITERS.INPUT);
    const resType: ResourceType = ResourceTypes[rTK];
    const currentPath: string[] = [];

    let targetNamespace: NamespaceStructure = newStructure;

    for (let i = 0; i < fullResourceTypeNameParts.length; i++) {
      const part = fullResourceTypeNameParts[i];

      currentPath.push(part);

      if (i === fullResourceTypeNameParts.length - 1) {
        targetNamespace.resourceTypes = targetNamespace.resourceTypes || {};
        targetNamespace.resourceTypes[part] = {
          ...resType,
          Type: rTK,
        };

        resourceTypeOptions.push(currentPath.join(NAMESPACE_DELIMITERS.OUTPUT));
      } else {
        targetNamespace.namespaces = targetNamespace.namespaces || {};
        targetNamespace.namespaces[part] = targetNamespace.namespaces[part] || { path: [...currentPath] };
        targetNamespace = targetNamespace.namespaces[part];
      }
    }
  }

  newStructure.includes = [`export type AllResourceTypes = ${resourceTypeOptions.join(' | ')};`, ...(newStructure.includes || [])];

  return newStructure;
};
