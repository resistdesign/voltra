import type { TypeInfoMap } from "../../common/TypeParsing/TypeInfo";

/**
 * Canonical TypeInfo map used by DBX E2E scenario tests.
 */
export const DBX_TYPE_INFO_MAP: TypeInfoMap = {
  Author: {
    primaryField: "id",
    fields: {
      id: {
        type: "string",
        array: false,
        readonly: false,
        optional: false,
        tags: { primaryField: true },
      },
      name: {
        type: "string",
        array: false,
        readonly: false,
        optional: false,
      },
      handle: {
        type: "string",
        array: false,
        readonly: false,
        optional: false,
      },
      role: {
        type: "string",
        array: false,
        readonly: false,
        optional: false,
        possibleValues: ["admin", "editor", "viewer"],
      },
    },
  },
  Post: {
    primaryField: "id",
    fields: {
      id: {
        type: "string",
        array: false,
        readonly: false,
        optional: false,
        tags: { primaryField: true },
      },
      title: {
        type: "string",
        array: false,
        readonly: false,
        optional: false,
      },
      body: {
        type: "string",
        array: false,
        readonly: false,
        optional: false,
      },
      status: {
        type: "string",
        array: false,
        readonly: false,
        optional: false,
        possibleValues: ["draft", "published", "archived"],
      },
      score: {
        type: "number",
        array: false,
        readonly: false,
        optional: false,
      },
      createdAt: {
        type: "string",
        array: false,
        readonly: false,
        optional: false,
        tags: { format: "date-time" },
      },
      tags: {
        type: "string",
        array: true,
        readonly: false,
        optional: true,
      },
      authorId: {
        type: "string",
        array: false,
        readonly: false,
        optional: false,
        typeReference: "Author",
      },
    },
  },
};

/**
 * Ordered list of DBX scenario type names.
 */
export const DBX_TYPE_NAMES = Object.keys(DBX_TYPE_INFO_MAP);
