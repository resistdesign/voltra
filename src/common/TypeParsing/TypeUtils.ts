export type TypeStructureTagMap = Record<
  string,
  {
    type?: string | undefined;
    value?: string | boolean | undefined;
  }
>;

export type TypeStructureUnionType = {
  type: string;
  literal: boolean;
  value: any;
};

export type TypeStructure = {
  namespace?: string;
  name: string;
  typeAlias?: string;
  type: string;
  isUnionType?: boolean;
  unionTypes?: TypeStructureUnionType[];
  literal?: boolean;
  readonly?: boolean;
  optional?: boolean;
  comboType?: boolean;
  multiple?: boolean | number;
  contentNames?: {
    allowed?: string[];
    disallowed?: string[];
  };
  content?: TypeStructure[];
  comments?: string[];
  tags?: TypeStructureTagMap;
};

export type TypeStructureMap = Record<string, TypeStructure>;

export type TypeStructureControllerItemOrdering = {
  onAddItemBefore?: () => void;
  onAddItemAfter?: () => void;
  onRemoveItem?: () => void;
  onInsertItemBeforeHere?: (itemToInsert: any) => void;
  onInsertItemAfterHere?: (itemToInsert: any) => void;
};

export type TypeStructureControllerBase =
  TypeStructureControllerItemOrdering & {
    typeStructure: TypeStructure;
    value: any;
    onChange: (value: any) => void;
    isListItem?: boolean;
    listItemIndex?: number;
  };

export type TypeStructureItemController = TypeStructureControllerBase & {
  contentControllers: TypeStructureController[];
};

export type TypeStructureItemListController = TypeStructureControllerBase & {
  value: any[];
  onChange: (value: any[]) => void;
  onAddItemAt: (index: number) => void;
  onRemoveItemAt: (index: number) => void;
  onMoveItem: (fromIndex: number, toIndex: number) => void;
  onInsertItemAt: (index: number, itemToInsert: any) => void;
  itemControllers: TypeStructureController[];
};

export type TypeStructureController =
  | TypeStructureItemController
  | TypeStructureItemListController;

export const identifyValueType = (
  value: any,
  typeStructureVariety: TypeStructure[] = [],
): TypeStructure | undefined => {
  const typeStructureMap: TypeStructureMap = typeStructureVariety.reduce<
    Record<string, TypeStructure>
  >((acc, typeStructure) => {
    acc[typeStructure.type] = typeStructure;

    return acc;
  }, {});
  const valueTypeSignature: string[] | string =
    value && typeof value === "object"
      ? Object.keys(value).sort()
      : typeof value;
  const scoreMap: Record<string, number> = {};

  for (const tS of typeStructureVariety) {
    if (
      typeof valueTypeSignature === "string" &&
      tS.type === valueTypeSignature
    ) {
      return tS;
    } else if (valueTypeSignature instanceof Array) {
      const typeSignature = tS.content?.length
        ? tS.content.map((tSC) => tSC.name).sort()
        : tS.type;

      if (typeSignature instanceof Array) {
        for (const typeSigProp of typeSignature) {
          if (valueTypeSignature.includes(typeSigProp)) {
            scoreMap[tS.type] = scoreMap[tS.type] ? scoreMap[tS.type] + 1 : 1;
          } else {
            scoreMap[tS.type] = scoreMap[tS.type] ? scoreMap[tS.type] : 0;
          }
        }
      }
    }
  }

  const typeList = Object.keys(scoreMap);

  return typeList.reduce<TypeStructure | undefined>((acc, typeName) => {
    if (!acc || scoreMap[typeName] > (scoreMap[acc.type] || 0)) {
      return typeStructureMap[typeName];
    } else {
      return acc;
    }
  }, typeStructureVariety[0]);
};

export const combineTypeStructures = (
  name: string,
  type: string,
  typeStructures: TypeStructure[] = [],
): TypeStructure | undefined => {
  let combinedTypeStructure: TypeStructure | undefined;

  for (const tS of typeStructures) {
    combinedTypeStructure = combinedTypeStructure
      ? {
          ...combinedTypeStructure,
          ...tS,
          content: [
            ...(combinedTypeStructure.content || []),
            ...(tS.content || []),
          ],
        }
      : tS;
  }

  return combinedTypeStructure
    ? {
        ...combinedTypeStructure,
        name,
        type,
      }
    : undefined;
};

export const getCleanType = (
  typeValue: string = "",
  namespace?: string,
): string => {
  const cleanType = typeValue.replace(/\[]/gim, () => "");

  return namespace ? `${namespace}.${cleanType}` : cleanType;
};

export const getTypeStructureWithFilteredContent = (
  { allowed = [], disallowed = [] }: TypeStructure["contentNames"] = {},
  typeStructure: TypeStructure,
): TypeStructure => {
  const { content = [] } = typeStructure;
  const newContent =
    allowed && allowed.length > 0
      ? content.filter((tS) => allowed.includes(tS.name))
      : disallowed && disallowed.length > 0
        ? content.filter((tS) => !disallowed.includes(tS.name))
        : content;

  return {
    ...typeStructure,
    content: newContent,
  };
};

export const getTypeStructureByName = <
  TypeStructureMapType extends TypeStructureMap,
  TypeStructureName extends keyof TypeStructureMapType,
>(
  name: TypeStructureName,
  map: TypeStructureMapType,
) => map[name];

export const getMergedTypeStructure = (
  ...typeStructures: TypeStructure[]
): TypeStructure | undefined => {
  let mergedTypeStructure: TypeStructure | undefined = undefined;

  for (const tS of typeStructures) {
    const partialMergedTS: Partial<TypeStructure> = mergedTypeStructure || {};
    const partialTS: Partial<TypeStructure> = tS || {};
    const { tags: mergedTags = {} } = partialMergedTS;
    const { tags: tSTags = {} } = partialTS;

    mergedTypeStructure = {
      ...partialMergedTS,
      ...tS,
      tags: {
        ...mergedTags,
        ...tSTags,
      },
    };
  }

  return mergedTypeStructure;
};

export const getUniqueStringArray = (arr: string[]): string[] =>
  arr.filter((item, index) => arr.indexOf(item) === index);

export const getCondensedTypeStructure = (
  typeStructure: TypeStructure,
  typeStructureMap: TypeStructureMap,
  mergeTagMaps?: (
    tagMapA: TypeStructureTagMap,
    tagMapB: TypeStructureTagMap,
  ) => TypeStructureTagMap,
  cache: TypeStructureMap = {},
): TypeStructure => {
  const { namespace, type, typeAlias, literal = false } = typeStructure;
  const cleanFullTypeName = getCleanType(type, namespace);

  let condensedTypeStructure = cache[cleanFullTypeName];

  if (!condensedTypeStructure) {
    if (literal) {
      condensedTypeStructure = typeStructure;
    } else {
      const mappedType = !!typeAlias
        ? typeStructureMap[typeAlias]
        : typeStructureMap[cleanFullTypeName];
      const {
        comboType = false,
        isUnionType = false,
        content = [],
      } = mappedType;

      if (mappedType) {
        if (isUnionType) {
          condensedTypeStructure = mappedType;
        } else if (comboType) {
          let mergedType: TypeStructure = {
            ...mappedType,
            // TRICKY: Reset this because we don't want to keep type references, just get their fields.
            content: [],
          };

          for (const subType of content) {
            const condensedSubType = getCondensedTypeStructure(
              subType,
              typeStructureMap,
              mergeTagMaps,
              cache,
            );
            const {
              contentNames: {
                allowed: subTypeAllowedContentNames,
                disallowed: subTypeDisallowedContentNames,
              } = {},
              content: subTypeContent = [],
              comments: subTypeComments = [],
              tags: subTypeTags = {},
            } = condensedSubType;
            const {
              contentNames: {
                allowed: mergedTypeAllowedContentNames,
                disallowed: mergedTypeDisallowedContentNames,
              } = {},
              content: mergedTypeContent = [],
              comments: mergedTypeComments = [],
              tags: mergedTypeTags = {},
            } = mergedType;
            const newMergedTypeAllowedContentNames =
              !!subTypeAllowedContentNames || !!mergedTypeAllowedContentNames
                ? getUniqueStringArray([
                    ...(mergedTypeAllowedContentNames || []),
                    ...(subTypeAllowedContentNames || []),
                  ])
                : undefined;
            const newMergedTypeDisallowedContentNames =
              !!subTypeDisallowedContentNames ||
              !!mergedTypeDisallowedContentNames
                ? getUniqueStringArray([
                    ...(mergedTypeDisallowedContentNames || []),
                    ...(subTypeDisallowedContentNames || []),
                  ])
                : undefined;
            const newMergedTypeContentNames =
              newMergedTypeAllowedContentNames ||
              newMergedTypeDisallowedContentNames
                ? {
                    allowed: newMergedTypeAllowedContentNames,
                    disallowed: newMergedTypeDisallowedContentNames,
                  }
                : undefined;

            mergedType = {
              ...mergedType,
              ...subType,
              contentNames: newMergedTypeContentNames,
              content: [...mergedTypeContent, ...subTypeContent],
              comments: [...mergedTypeComments, ...subTypeComments],
              tags: !!mergeTagMaps
                ? mergeTagMaps(mergedTypeTags, subTypeTags)
                : { ...mergedTypeTags, ...subTypeTags },
            };
          }

          condensedTypeStructure = mergedType;
        } else {
          condensedTypeStructure = getCondensedTypeStructure(
            mappedType,
            typeStructureMap,
            mergeTagMaps,
            cache,
          );
        }
      } else {
        condensedTypeStructure = typeStructure;
      }
    }
  }

  cache[cleanFullTypeName] = condensedTypeStructure;

  return condensedTypeStructure;
};

export const getCleanTypeStructure = (
  typeStructure: TypeStructure,
  typeStructureMap?: TypeStructureMap,
): TypeStructure => {
  const {
    namespace,
    name,
    type,
    typeAlias,
    literal,
    comments = [],
    tags = {},
  }: TypeStructure = typeStructure;

  if (literal) {
    return typeStructure;
  } else {
    const cleanType = getCleanType(type);
    const cleanTypeWithNamespace = getCleanType(type, namespace);
    const {
      [cleanTypeWithNamespace]: mappedTypeStructureWithNamespace,
      [cleanType]: mappedTypeStructureNoNamespace,
    } = typeStructureMap || {};
    const useMappedWithNamespace = !!mappedTypeStructureWithNamespace;
    const mappedTypeStructure = useMappedWithNamespace
      ? mappedTypeStructureWithNamespace
      : mappedTypeStructureNoNamespace;
    const {
      comments: mappedTypeStructureComments = [],
      tags: mappedTypeStructureTags = {},
    } = mappedTypeStructure || {};
    const mergedTypeStructure: TypeStructure = {
      ...mappedTypeStructure,
      ...typeStructure,
      name,
      typeAlias: mappedTypeStructure ? type : typeAlias,
      comments: [...mappedTypeStructureComments, ...comments],
      tags: { ...mappedTypeStructureTags, ...tags },
    };
    const typeForMatching = useMappedWithNamespace
      ? cleanTypeWithNamespace
      : cleanType;
    const cleanMappedType = getCleanType(
      mappedTypeStructure?.type || "",
      mappedTypeStructure?.namespace,
    );

    if (mappedTypeStructure && cleanMappedType !== typeForMatching) {
      return getCleanTypeStructure(mergedTypeStructure, typeStructureMap);
    }

    return mergedTypeStructure;
  }
};

export const getCleanTypeStructureMap = (
  typeStructureMap: TypeStructureMap,
): TypeStructureMap => {
  const cleanTypeStructureMap: TypeStructureMap = {};

  for (const [key, typeStructure] of Object.entries(typeStructureMap)) {
    cleanTypeStructureMap[key] = getCleanTypeStructure(
      typeStructure,
      typeStructureMap,
    );
  }

  return cleanTypeStructureMap;
};

export const getTypeStructureByPath = (
  path: (string | number)[],
  typeStructure: TypeStructure,
  typeStructureMap: TypeStructureMap,
): TypeStructure => {
  const { multiple = false, type = "" } = typeStructure;
  const baseTS = getCleanTypeStructure(typeStructure, typeStructureMap);
  const { content = [] }: Partial<TypeStructure> = baseTS || {};
  const [firstPathPart, ...multiPath] = path;
  const firstPathPartIsNumber = !isNaN(Number(firstPathPart));
  const firstPathPartIsInContent = !!content.find(
    ({ name }) => name === firstPathPart,
  );
  const isItemSubPath = firstPathPartIsNumber || !firstPathPartIsInContent;
  const targetPath = multiple && isItemSubPath ? multiPath : path;

  let tS = baseTS;

  if (tS && targetPath.length > 0) {
    const [targetPathPart, ...remainingPath] = targetPath;
    const { content: currentContentList = [] } = tS;
    const targetContent = currentContentList.find(
      ({ name }) => name === targetPathPart,
    );

    if (targetContent) {
      tS = getTypeStructureByPath(
        remainingPath,
        targetContent,
        typeStructureMap,
      );
    }
  }

  return tS ? tS : ({} as any);
};

export const getTypeStructureIsPrimitive = (typeStructure: TypeStructure) => {
  const { literal = false, content = [] } = typeStructure;

  return literal && content.length === 0;
};

export const getDefaultItemForTypeStructure = (
  typeStructure: TypeStructure,
): any => {
  const { type, multiple } = typeStructure;
  const isPrimitive = getTypeStructureIsPrimitive(typeStructure);

  if (isPrimitive) {
    switch (type) {
      case "string":
        return "";
      case "number":
        return 0;
      case "boolean":
        return false;
      default:
        return undefined;
    }
  } else {
    return multiple ? [] : {};
  }
};

export enum TAG_TYPES {
  label = "label",
  inline = "inline",
  layout = "layout",
  displayLayout = "displayLayout",
  itemName = "itemName",
  options = "options",
  optionsType = "optionsType",
  allowCustomValue = "allowCustomValue",
}

export const getCleanPrimitiveStringValue = (value: any): string =>
  value !== undefined && value !== null ? `${value}` : "";

export const getItemName = <ValueType extends Record<any, any>>(
  item: ValueType = {} as any,
  itemNameTemplate: string = "",
): string =>
  itemNameTemplate.replace(/\`(\w+)\`/g, (match, key) =>
    getCleanPrimitiveStringValue(item[key]),
  );

export const getTagValue = (
  tagName: string,
  typeStructure: TypeStructure,
): string | boolean | undefined => {
  const { tags: { [tagName]: { value: tagValue = undefined } = {} } = {} } =
    typeStructure;

  return tagValue;
};

export const getTagValues = <TagName extends string>(
  tagNames: TagName[] = [],
  typeStructure: TypeStructure,
): Record<TagName, any> => {
  const tagValues: Partial<Record<TagName, any>> = {};

  for (const tagName of tagNames) {
    tagValues[tagName] = getTagValue(tagName, typeStructure);
  }

  return tagValues as any;
};

export const getItemNameKeys = (itemNameTemplate: string = ""): string[] =>
  itemNameTemplate.match(/\`(\w+)\`/g) ?? [];

export const getValueLabel = (
  value: any,
  typeStructure: TypeStructure,
  typeStructureMap: TypeStructureMap,
): string => {
  const itemNameTemplate = getTagValue(TAG_TYPES.itemName, typeStructure);

  if (typeof itemNameTemplate === "string" && itemNameTemplate.trim() !== "") {
    const itemNameKeys = getItemNameKeys(itemNameTemplate);
    const templateValueItem: Record<string, any> = {};

    for (const itemNameKey of itemNameKeys) {
      const key = itemNameKey.replace(/\`/g, "");
      const typeStructureItem = getTypeStructureByPath(
        [key],
        typeStructure,
        typeStructureMap,
      );

      templateValueItem[key] = getValueLabel(
        value?.[key],
        typeStructureItem,
        typeStructureMap,
      );
    }

    return getItemName(templateValueItem, itemNameTemplate);
  } else {
    return value === undefined || value === null ? "" : `${value}`;
  }
};
