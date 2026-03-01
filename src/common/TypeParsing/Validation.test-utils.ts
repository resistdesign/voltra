import {
  DENIED_TYPE_OPERATIONS,
  ERROR_MESSAGE_CONSTANTS,
  PRIMITIVE_ERROR_MESSAGE_CONSTANTS,
  RelationshipValidationType,
  getErrorDescriptor,
  getErrorDescriptors,
  validateTypeInfoDataItem,
  validateTypeInfoValue,
} from "./Validation";
import { TypeOperation, type TypeInfo, type TypeInfoMap } from "./TypeInfo";

const createPersonNameMap = (): TypeInfoMap => ({
  Person: {
    fields: {
      name: {
        type: "string",
        array: false,
        readonly: false,
        optional: false,
      },
    },
  },
});

const createBooleanMap = (): TypeInfoMap => ({
  Person: {
    fields: {
      likesCheese: {
        type: "boolean",
        array: false,
        readonly: false,
        optional: false,
      },
    },
  },
});

const createNumberMap = (): TypeInfoMap => ({
  Person: {
    fields: {
      age: {
        type: "number",
        array: false,
        readonly: false,
        optional: false,
      },
    },
  },
});

const createPatternMap = (): TypeInfoMap => ({
  Person: {
    fields: {
      phoneNumber: {
        type: "string",
        array: false,
        readonly: false,
        optional: false,
        tags: {
          constraints: {
            pattern: "^\\+\\d{1,2} \\(\\d{3}\\) \\d{3}-\\d{4}$",
          },
        },
      },
    },
  },
});

const createRangeMap = (): TypeInfoMap => ({
  Person: {
    fields: {
      age: {
        type: "number",
        array: false,
        readonly: false,
        optional: false,
        tags: {
          constraints: {
            min: 18,
            max: 65,
          },
        },
      },
    },
  },
});

const createPossibleValuesMap = (): TypeInfoMap => ({
  Person: {
    fields: {
      status: {
        type: "string",
        array: false,
        readonly: false,
        optional: false,
        possibleValues: ["ACTIVE", "INACTIVE"],
      },
    },
  },
});

const createStrictMap = (): TypeInfoMap => ({
  Person: {
    fields: {
      name: {
        type: "string",
        array: false,
        readonly: false,
        optional: false,
      },
    },
  },
});

const createDeniedCreateMap = (): TypeInfoMap => ({
  Person: {
    fields: {
      name: {
        type: "string",
        array: false,
        readonly: false,
        optional: false,
      },
    },
    tags: {
      deniedOperations: {
        [TypeOperation.CREATE]: true,
      },
    },
  },
});

const createRelationshipMap = (): TypeInfoMap => ({
  Person: {
    fields: {
      car: {
        type: "string",
        typeReference: "Car",
        array: false,
        readonly: false,
        optional: false,
      },
    },
  },
  Car: {
    fields: {
      make: {
        type: "string",
        array: false,
        readonly: false,
        optional: false,
      },
    },
  },
});

const createArrayMap = (): TypeInfoMap => ({
  Person: {
    fields: {
      tags: {
        type: "string",
        array: true,
        readonly: false,
        optional: false,
      },
    },
  },
});

export const runValidateTypeInfoValueCreateScenario = () =>
  validateTypeInfoValue(
    {
      name: "Violet",
    },
    "Person",
    createPersonNameMap(),
    true,
    undefined,
    TypeOperation.CREATE,
    undefined,
    false,
  );

export const runValidateTypeInfoValueCreateRequiredBooleanFalseScenario = () =>
  validateTypeInfoValue(
    {
      likesCheese: false,
    },
    "Person",
    createBooleanMap(),
    true,
    undefined,
    TypeOperation.CREATE,
    undefined,
    false,
  );

export const runValidateTypeInfoValueCreateRequiredNumberZeroScenario = () =>
  validateTypeInfoValue(
    {
      age: 0,
    },
    "Person",
    createNumberMap(),
    true,
    undefined,
    TypeOperation.CREATE,
    undefined,
    false,
  );

export const runValidateTypeInfoValueCreateMissingRequiredBooleanScenario = () =>
  validateTypeInfoValue(
    {},
    "Person",
    createBooleanMap(),
    true,
    undefined,
    TypeOperation.CREATE,
    undefined,
    false,
  );

export const runValidateTypeInfoValuePatternMismatchScenario = () =>
  validateTypeInfoValue(
    {
      phoneNumber: "123-456-7890",
    },
    "Person",
    createPatternMap(),
    true,
    undefined,
    TypeOperation.CREATE,
    undefined,
    false,
  );

export const runValidateTypeInfoValuePatternMatchScenario = () =>
  validateTypeInfoValue(
    {
      phoneNumber: "+1 (555) 123-4567",
    },
    "Person",
    createPatternMap(),
    true,
    undefined,
    TypeOperation.CREATE,
    undefined,
    false,
  );

export const runValidateTypeInfoValueMinimumScenario = () =>
  validateTypeInfoValue(
    {
      age: 17,
    },
    "Person",
    createRangeMap(),
    true,
    undefined,
    TypeOperation.CREATE,
    undefined,
    false,
  );

export const runValidateTypeInfoValueMaximumScenario = () =>
  validateTypeInfoValue(
    {
      age: 66,
    },
    "Person",
    createRangeMap(),
    true,
    undefined,
    TypeOperation.CREATE,
    undefined,
    false,
  );

export const runValidateTypeInfoValuePossibleValuesMismatchScenario = () =>
  validateTypeInfoValue(
    {
      status: "PENDING",
    },
    "Person",
    createPossibleValuesMap(),
    true,
    undefined,
    TypeOperation.CREATE,
    undefined,
    false,
  );

export const runValidateTypeInfoValueStrictUnknownFieldScenario = () =>
  validateTypeInfoValue(
    {
      name: "Ada",
      extra: "nope",
    },
    "Person",
    createStrictMap(),
    true,
    undefined,
    TypeOperation.CREATE,
    undefined,
    false,
  );

export const runValidateTypeInfoValueDeniedCreateOperationScenario = () =>
  validateTypeInfoValue(
    {
      name: "Ada",
    },
    "Person",
    createDeniedCreateMap(),
    true,
    undefined,
    TypeOperation.CREATE,
    undefined,
    false,
  );

export const runValidateTypeInfoValueRelationshipStrictExcludeScenario = () =>
  validateTypeInfoValue(
    {
      car: {
        make: "Tesla",
      },
    },
    "Person",
    createRelationshipMap(),
    true,
    undefined,
    TypeOperation.CREATE,
    RelationshipValidationType.STRICT_EXCLUDE,
    false,
  );

export const runValidateTypeInfoValueRelationshipIncludeInvalidNestedScenario = () =>
  validateTypeInfoValue(
    {
      car: {
        make: 42,
      },
    },
    "Person",
    createRelationshipMap(),
    true,
    undefined,
    TypeOperation.CREATE,
    RelationshipValidationType.INCLUDE,
    false,
  );

export const runValidateTypeInfoValueArrayElementTypeMismatchScenario = () =>
  validateTypeInfoValue(
    {
      tags: ["ok", 2 as any],
    },
    "Person",
    createArrayMap(),
    true,
    undefined,
    TypeOperation.CREATE,
    undefined,
    false,
  );

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
