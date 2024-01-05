import { TypeStructure, TypeStructureMap } from './TypeUtils';
import {
  ArrayTypeNode,
  createSourceFile,
  IntersectionTypeNode,
  JSDoc,
  JSDocComment,
  JSDocTag,
  ModuleDeclaration,
  Node,
  ScriptTarget,
  SyntaxKind,
  TypeNode,
  UnionTypeNode,
} from 'typescript';

const SUPPORTED_TYPE_REFERENCE_FEATURES = {
  PICK: 'Pick',
  OMIT: 'Omit',
};

type TypeStructureGenerator = (
  name: string,
  typeNode: Node,
  options?: {
    parentName?: string;
    namespace?: string;
  }
) => TypeStructure;

const TYPE_HANDLING_MAP: Partial<Record<SyntaxKind, TypeStructureGenerator>> = {
  [SyntaxKind.TypeLiteral]: (name: string, typeNode: Node, { parentName, namespace } = {}): TypeStructure => {
    const content: TypeStructure[] = [];

    typeNode.forEachChild((tLChild) => {
      if (tLChild.kind === SyntaxKind.PropertySignature) {
        let identifier: string = '',
          subTypeNode: Node | undefined,
          optional: boolean = false,
          readonly = false;

        tLChild.forEachChild((pSChild) => {
          if (pSChild.kind === SyntaxKind.ReadonlyKeyword) {
            readonly = true;
          } else if (pSChild.kind === SyntaxKind.Identifier) {
            identifier = pSChild.getText();
          } else if (pSChild.kind === SyntaxKind.QuestionToken) {
            optional = true;
          } else {
            subTypeNode = pSChild;
          }
        });

        if (subTypeNode) {
          const fullParentName = parentName ? `${parentName}.${name}` : name;

          content.push({
            ...parseType(identifier, subTypeNode, { parentName: fullParentName, namespace }),
            optional,
            readonly,
          });
        }
      }
    });

    return {
      namespace,
      name,
      type: parentName ? `${parentName}.${name}` : name,
      literal: true,
      content,
    };
  },
  [SyntaxKind.UnionType]: (name: string, typeNode: Node, { parentName, namespace } = {}): TypeStructure => {
    const { types = [] } = typeNode as UnionTypeNode;

    return {
      namespace,
      name,
      type: parentName ? `${parentName}.${name}` : name,
      varietyType: true,
      content: types.map((t: TypeNode) => parseType(name, t, { parentName, namespace })),
    };
  },
  [SyntaxKind.IntersectionType]: (name: string, typeNode: Node, { parentName, namespace } = {}): TypeStructure => {
    const { types = [] } = typeNode as IntersectionTypeNode;

    return {
      namespace,
      name,
      type: parentName ? `${parentName}.${name}` : name,
      comboType: true,
      content: types.map((t: TypeNode) => parseType(name, t, { parentName, namespace })),
    };
  },
  [SyntaxKind.ArrayType]: (name: string, typeNode: Node, { parentName, namespace } = {}): TypeStructure => {
    const { elementType } = typeNode as ArrayTypeNode;
    const extendedTS: TypeStructure = parseType(name, elementType, { parentName, namespace });
    const { multiple: extendedMultiple = false } = extendedTS;

    return {
      ...extendedTS,
      multiple: typeof extendedMultiple === 'number' ? extendedMultiple + 1 : 1,
    };
  },
  [SyntaxKind.TypeReference]: (
    name: string,
    typeNode: Node,
    { parentName: _parentName, namespace } = {}
  ): TypeStructure => {
    let identifier = '';
    let referencedTypeName = '';
    let contentNamesString = '';

    typeNode.forEachChild((n) => {
      if (n.kind === SyntaxKind.Identifier) {
        identifier = n.getText();
      }

      if (n.kind === SyntaxKind.TypeReference) {
        referencedTypeName = n.getText();
      }

      if (n.kind === SyntaxKind.LiteralType || n.kind === SyntaxKind.UnionType) {
        contentNamesString = n.getText();
      }
    });

    if (identifier && referencedTypeName && contentNamesString) {
      const baseTS: Pick<TypeStructure, 'namespace' | 'name' | 'type'> = {
        namespace,
        name,
        type: referencedTypeName,
      };
      const contentNames = contentNamesString.replace(/[\s'"]/gim, () => '').split('|');

      if (identifier === SUPPORTED_TYPE_REFERENCE_FEATURES.PICK) {
        return {
          ...baseTS,
          contentNames: {
            allowed: contentNames,
          },
        };
      } else if (identifier === SUPPORTED_TYPE_REFERENCE_FEATURES.OMIT) {
        return {
          ...baseTS,
          contentNames: {
            disallowed: contentNames,
          },
        };
      }
    }

    return {
      namespace,
      name,
      type: typeNode.getText(),
    };
  },
};

const parseType: TypeStructureGenerator = (
  name: string,
  typeNode: Node,
  { parentName, namespace } = {}
): TypeStructure => {
  const typeHandling = TYPE_HANDLING_MAP[typeNode.kind];
  const comments: TypeStructure['comments'] = [];
  const tags: TypeStructure['tags'] = {};

  if ((typeNode?.parent as any)?.jsDoc) {
    (typeNode.parent as any).jsDoc.forEach((doc: JSDoc) => {
      if (typeof doc.comment === 'string') {
        comments.push(doc.comment);
      } else {
        doc.comment?.forEach((c: JSDocComment) => {
          comments.push(c.getText());
        });
      }

      if (doc?.tags) {
        doc.tags.forEach((tag: JSDocTag) => {
          const tagName = tag.tagName.getText();
          const tagType = (tag as any).typeExpression?.type?.getText();
          const tagValue =
            !tag.comment && !tagType
              ? // If there is no value and no type, the tag is just `true`.
                true
              : typeof tag.comment === 'string'
              ? tag.comment
              : undefined;

          tags[tagName] = {
            type: tagType,
            value: tagValue,
          };
        });
      }
    });
  }

  if (typeHandling) {
    const {
      comments: handledComments = [],
      tags: handledTags = {},
      ...otherHandledTypeProps
    } = typeHandling(name, typeNode, { parentName, namespace }) || {};

    return {
      comments: [...comments, ...handledComments],
      tags: {
        ...tags,
        ...handledTags,
      },
      ...otherHandledTypeProps,
    };
  } else {
    return {
      namespace,
      name,
      type: typeNode.getText(),
      literal: true,
      comments,
      tags,
    };
  }
};

const getTypeMap = (typeNode: Node, namespace?: string): TypeStructureMap => {
  let map: TypeStructureMap = {};

  typeNode.forEachChild((n) => {
    if (n.kind === SyntaxKind.ModuleDeclaration) {
      const { name } = n as ModuleDeclaration;
      const newNamespace = namespace ? `${namespace}.${name.getText()}` : name.getText();

      n.forEachChild((cN) => {
        map = {
          ...map,
          ...getTypeMap(cN, newNamespace),
        };
      });
    } else if (n.kind === SyntaxKind.TypeAliasDeclaration) {
      let identifier: string = '',
        isExport = false,
        nNode: Node | undefined;

      n.forEachChild((n2) => {
        if (n2.kind === SyntaxKind.ExportKeyword) {
          isExport = true;
        } else if (n2.kind === SyntaxKind.Identifier) {
          identifier = n2.getText();
        } else {
          nNode = n2;
        }
      });

      if (isExport && nNode) {
        const mapKey = namespace ? `${namespace}.${identifier}` : identifier;

        map[mapKey] = parseType(identifier, nNode, { namespace });
      }
    }
  });

  return map;
};

export const convertTypeScriptToTypeStructureMap = (typeScriptText: string): TypeStructureMap => {
  const typeScriptNode: Node = createSourceFile('x.ts', typeScriptText, ScriptTarget.Latest, true);

  return getTypeMap(typeScriptNode);
};
