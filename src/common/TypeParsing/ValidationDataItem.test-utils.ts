import type { TypeInfo } from "./TypeInfo";
import {
  DENIED_TYPE_OPERATIONS,
  ERROR_MESSAGE_CONSTANTS,
  PRIMITIVE_ERROR_MESSAGE_CONSTANTS,
  getErrorDescriptors,
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
    hiddenValidatedCode:
      getErrorDescriptors(hiddenValidated.errorMap.secret ?? [])[0]?.code ?? null,
    readonlyDefaultValid: readonlyDefault.valid,
    readonlyValidatedCode:
      getErrorDescriptors(readonlyValidated.errorMap.token ?? [])[0]?.code ?? null,
    emptyArrayInvalidCode:
      getErrorDescriptors(emptyArrayInvalid.errorMap.tags ?? [])[0]?.code ?? null,
    emptyArrayValid: emptyArrayValid.valid,
    customValidatorInvalidCode:
      getErrorDescriptors(customValidatorInvalid.errorMap.nickname ?? []).find(
        (e) => e.code !== ERROR_MESSAGE_CONSTANTS.NONE,
      )?.code ?? null,
    customValidatorValid: customValidatorValid.valid,
  };
};

export const runValidationErrorConstantsScenario = () => {
  const hasOwn = (key: string) =>
    Object.prototype.hasOwnProperty.call(ERROR_MESSAGE_CONSTANTS, key);

  return {
    primitiveStringCode: PRIMITIVE_ERROR_MESSAGE_CONSTANTS.string,
    primitiveNumberCode: PRIMITIVE_ERROR_MESSAGE_CONSTANTS.number,
    primitiveBooleanCode: PRIMITIVE_ERROR_MESSAGE_CONSTANTS.boolean,
    primitiveStringMappedInErrorConstants:
      ERROR_MESSAGE_CONSTANTS[PRIMITIVE_ERROR_MESSAGE_CONSTANTS.string] ===
      PRIMITIVE_ERROR_MESSAGE_CONSTANTS.string,
    primitiveNumberMappedInErrorConstants:
      ERROR_MESSAGE_CONSTANTS[PRIMITIVE_ERROR_MESSAGE_CONSTANTS.number] ===
      PRIMITIVE_ERROR_MESSAGE_CONSTANTS.number,
    primitiveBooleanMappedInErrorConstants:
      ERROR_MESSAGE_CONSTANTS[PRIMITIVE_ERROR_MESSAGE_CONSTANTS.boolean] ===
      PRIMITIVE_ERROR_MESSAGE_CONSTANTS.boolean,
    deniedCreateMappedInErrorConstants:
      ERROR_MESSAGE_CONSTANTS[DENIED_TYPE_OPERATIONS.CREATE] ===
      DENIED_TYPE_OPERATIONS.CREATE,
    deniedReadMappedInErrorConstants:
      ERROR_MESSAGE_CONSTANTS[DENIED_TYPE_OPERATIONS.READ] ===
      DENIED_TYPE_OPERATIONS.READ,
    deniedUpdateMappedInErrorConstants:
      ERROR_MESSAGE_CONSTANTS[DENIED_TYPE_OPERATIONS.UPDATE] ===
      DENIED_TYPE_OPERATIONS.UPDATE,
    deniedDeleteMappedInErrorConstants:
      ERROR_MESSAGE_CONSTANTS[DENIED_TYPE_OPERATIONS.DELETE] ===
      DENIED_TYPE_OPERATIONS.DELETE,
    hasLegacyCreateProperty: hasOwn("CREATE"),
    hasLegacyReadProperty: hasOwn("READ"),
    hasLegacyUpdateProperty: hasOwn("UPDATE"),
    hasLegacyDeleteProperty: hasOwn("DELETE"),
    hasLowercasePrimitiveStringProperty: hasOwn("string"),
    hasLowercasePrimitiveNumberProperty: hasOwn("number"),
    hasLowercasePrimitiveBooleanProperty: hasOwn("boolean"),
  };
};

export const runArrayItemErrorMapScenario = () => {
  const results = validateTypeInfoDataItem(
    {
      tags: ["ok", 2 as any],
    },
    {
      fields: {
        tags: {
          type: "string",
          array: true,
          readonly: false,
          optional: false,
        },
      },
    },
  );

  const entries = results.errorMap.tags ?? [];
  const itemCollection = entries.find(
    (entry): entry is { itemErrorMap: Record<number, Array<{ code: string }>> } =>
      !!entry && typeof entry === "object" && "itemErrorMap" in entry,
  );

  return {
    valid: results.valid,
    topLevelCode: results.error.code,
    fieldCode:
      entries.find((entry): entry is { code: string } => "code" in (entry as any))
        ?.code ?? null,
    index1Codes: itemCollection?.itemErrorMap?.[1]?.map((d) => d.code) ?? [],
  };
};
