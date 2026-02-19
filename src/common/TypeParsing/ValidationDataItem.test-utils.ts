import type { TypeInfo } from "./TypeInfo";
import {
  ERROR_MESSAGE_CONSTANTS,
  getErrorDescriptor,
  validateTypeInfoDataItem,
} from "./Validation";

export const runTypeInfoDataItemValidationScenario = () => {
  const hiddenTypeInfo: TypeInfo = {
    fields: {
      secret: {
        type: "string",
        array: false,
        readonly: false,
        optional: false,
        tags: { hidden: true },
      },
    },
  };
  const hiddenDefault = validateTypeInfoDataItem({}, hiddenTypeInfo);
  const hiddenValidated = validateTypeInfoDataItem({}, hiddenTypeInfo, {}, {
    validateHidden: true,
  });

  const readonlyTypeInfo: TypeInfo = {
    fields: {
      token: {
        type: "string",
        array: false,
        readonly: true,
        optional: false,
      },
    },
  };
  const readonlyDefault = validateTypeInfoDataItem({}, readonlyTypeInfo);
  const readonlyValidated = validateTypeInfoDataItem({}, readonlyTypeInfo, {}, {
    validateReadonly: true,
  });

  const arrayTypeInfo: TypeInfo = {
    fields: {
      tags: {
        type: "string",
        array: true,
        readonly: false,
        optional: false,
      },
    },
  };
  const emptyArrayInvalid = validateTypeInfoDataItem({ tags: [] }, arrayTypeInfo);
  const emptyArrayValid = validateTypeInfoDataItem(
    { tags: [] },
    {
      fields: {
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
    },
  );

  const customTypeInfo: TypeInfo = {
    fields: {
      nickname: {
        type: "string",
        array: false,
        readonly: false,
        optional: false,
      },
    },
  };
  const customValidatorInvalid = validateTypeInfoDataItem(
    { nickname: "admin" },
    customTypeInfo,
    {
      nickname: (value) =>
        value === "admin"
          ? getErrorDescriptor("RESERVED_NAME")
          : getErrorDescriptor(ERROR_MESSAGE_CONSTANTS.NONE),
    },
  );
  const customValidatorValid = validateTypeInfoDataItem(
    { nickname: "ada" },
    customTypeInfo,
    {
      nickname: (value) =>
        value === "admin"
          ? getErrorDescriptor("RESERVED_NAME")
          : getErrorDescriptor(ERROR_MESSAGE_CONSTANTS.NONE),
    },
  );

  return {
    hiddenDefaultValid: hiddenDefault.valid,
    hiddenValidatedCode: hiddenValidated.errorMap.secret?.[0]?.code ?? null,
    readonlyDefaultValid: readonlyDefault.valid,
    readonlyValidatedCode: readonlyValidated.errorMap.token?.[0]?.code ?? null,
    emptyArrayInvalidCode: emptyArrayInvalid.errorMap.tags?.[0]?.code ?? null,
    emptyArrayValid: emptyArrayValid.valid,
    customValidatorInvalidCode:
      customValidatorInvalid.errorMap.nickname?.find((e) => e.code !== "NONE")
        ?.code ?? null,
    customValidatorValid: customValidatorValid.valid,
  };
};
