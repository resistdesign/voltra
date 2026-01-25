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
        optional: true,
      },
      handle: {
        type: "string",
        array: false,
        readonly: false,
        optional: true,
      },
      role: {
        type: "string",
        array: false,
        readonly: false,
        optional: true,
      },
      posts: {
        type: "string",
        array: true,
        readonly: false,
        optional: true,
        typeReference: "Post",
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
        optional: true,
      },
      body: {
        type: "string",
        array: false,
        readonly: false,
        optional: true,
      },
      status: {
        type: "string",
        array: false,
        readonly: false,
        optional: true,
      },
      score: {
        type: "number",
        array: false,
        readonly: false,
        optional: true,
      },
      createdAt: {
        type: "string",
        array: false,
        readonly: false,
        optional: true,
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
        optional: true,
      },
      author: {
        type: "string",
        array: false,
        readonly: false,
        optional: true,
        typeReference: "Author",
      },
    },
  },
};

/**
 * Ordered list of DBX scenario type names.
 */
export const DBX_TYPE_NAMES = Object.keys(DBX_TYPE_INFO_MAP);
