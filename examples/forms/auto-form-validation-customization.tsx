import type { TypeInfo } from "@resistdesign/voltra/common";
import { ERROR_MESSAGE_CONSTANTS } from "@resistdesign/voltra/common";
import { AutoForm, createWebFormRenderer } from "@resistdesign/voltra/web";

const renderer = createWebFormRenderer();

const UserTypeInfo: TypeInfo = {
  fields: {
    username: {
      type: "string",
      array: false,
      readonly: false,
      optional: false,
    },
    internalCode: {
      type: "string",
      array: false,
      readonly: false,
      optional: false,
      tags: {
        hidden: true,
        validation: {
          validateHidden: true,
        },
      },
    },
  },
};

export const AutoFormValidationCustomizationExample = () => (
  <AutoForm
    renderer={renderer}
    typeInfo={UserTypeInfo}
    customValidatorMap={{
      username: (value) =>
        typeof value === "string" && value.toLowerCase() === "admin"
          ? { code: "USERNAME_RESERVED" }
          : { code: ERROR_MESSAGE_CONSTANTS.NONE },
    }}
    translateValidationErrorCode={(error) => {
      if (error.code === "USERNAME_RESERVED") {
        return "That username is reserved.";
      }
      if (error.code === ERROR_MESSAGE_CONSTANTS.MISSING) {
        return "Please provide a value.";
      }
      return error.code === ERROR_MESSAGE_CONSTANTS.NONE ? "" : error.code;
    }}
    onSubmit={(values) => {
      console.log(values);
    }}
  />
);
