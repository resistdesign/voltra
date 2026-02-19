import type { TypeInfoDataItem, TypeInfo } from "@resistdesign/voltra/common";
import {
  ERROR_MESSAGE_CONSTANTS,
  getErrorDescriptor,
  validateTypeInfoDataItem,
} from "@resistdesign/voltra/common";

const BookTypeInfo: TypeInfo = {
  fields: {
    title: {
      type: "string",
      array: false,
      readonly: false,
      optional: false,
    },
    tags: {
      type: "string",
      array: true,
      readonly: false,
      optional: false,
      tags: {
        validation: {
          emptyArrayIsValid: true,
        },
      },
    },
  },
};

const item: Partial<TypeInfoDataItem> = {
  title: "Guide",
  tags: [],
};

export const validationResult = validateTypeInfoDataItem(
  item,
  BookTypeInfo,
  {
    title: (value) =>
      typeof value === "string" && value.toLowerCase() === "forbidden"
        ? getErrorDescriptor("TITLE_NOT_ALLOWED")
        : getErrorDescriptor(ERROR_MESSAGE_CONSTANTS.NONE),
  },
);
