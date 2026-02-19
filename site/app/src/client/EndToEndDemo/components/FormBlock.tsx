import type { FC } from "react";
import type { RelationActionPayload } from "../../../../../../src/app/forms";
import { AutoFormView } from "../../../../../../src/web/forms";
import { useFormEngine } from "../../../../../../src/app/forms";
import type { FormErrorInputMap } from "../../../../../../src/app/forms";
import type {
  ArrayErrorDescriptorCollection,
  ErrorDescriptor,
} from "../../../../../../src/common/TypeParsing/Validation";
import { ERROR_MESSAGE_CONSTANTS } from "../../../../../../src/common/TypeParsing/Validation";
import type { TypeInfo } from "../../../../../../src/common/TypeParsing/TypeInfo";
import { TypeOperation } from "../../../../../../src/common/TypeParsing/TypeInfo";

type FormBlockProps = {
  typeInfo: TypeInfo;
  initialValues: Record<string, any>;
  operation: TypeOperation;
  onSubmit: (values: any) => Promise<unknown> | void;
  onRelationAction?: (payload: RelationActionPayload) => void;
  submitDisabled?: boolean;
};

export const FormBlock: FC<FormBlockProps> = ({
  typeInfo,
  initialValues,
  operation,
  onSubmit,
  onRelationAction,
  submitDisabled,
}) => {
  const controller = useFormEngine(initialValues, typeInfo, { operation });
  const handleSubmit = (values: any) => {
    controller.setErrors({});
    const result = onSubmit(values);

    if (result && typeof (result as Promise<unknown>).catch === "function") {
      return (result as Promise<unknown>).catch((error) => {
        const fieldErrors = extractValidationErrors(error);

        if (fieldErrors) {
          controller.setErrors(fieldErrors);
        }
      });
    }

    return result;
  };

  return (
    <AutoFormView
      controller={controller}
      onSubmit={handleSubmit}
      onRelationAction={onRelationAction}
      submitDisabled={submitDisabled}
      translateValidationErrorCode={translateValidationErrorCode}
    />
  );
};

const extractValidationErrors = (
  error: unknown,
): FormErrorInputMap | null => {
  if (!error || typeof error !== "object") {
    return null;
  }

  const errorMap =
    (error as { errorMap?: Record<string, unknown> }).errorMap ??
    (error as { error?: { errorMap?: Record<string, unknown> } }).error
      ?.errorMap;

  if (!errorMap || typeof errorMap !== "object") {
    return null;
  }

  const fieldErrors: FormErrorInputMap = {};

  for (const [key, value] of Object.entries(errorMap)) {
    const fieldKey = getTopLevelFieldKey(key);
    const entries = getErrorEntries(value);

    if (
      fieldKey &&
      entries.length &&
      !fieldErrors[fieldKey]
    ) {
      fieldErrors[fieldKey] = entries;
    }
  }

  return Object.keys(fieldErrors).length ? fieldErrors : null;
};

const getErrorEntries = (
  value: unknown,
): (ErrorDescriptor | ArrayErrorDescriptorCollection)[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const entries: (ErrorDescriptor | ArrayErrorDescriptorCollection)[] = [];

  for (const entry of value) {
    if (
      entry &&
      typeof entry === "object" &&
      "code" in entry &&
      typeof entry.code === "string"
    ) {
      const descriptor = entry as ErrorDescriptor;
      if (descriptor.code !== ERROR_MESSAGE_CONSTANTS.NONE) {
        entries.push(descriptor);
      }
      continue;
    }

    if (
      entry &&
      typeof entry === "object" &&
      "itemErrorMap" in entry &&
      typeof (entry as any).itemErrorMap === "object"
    ) {
      entries.push(entry as ArrayErrorDescriptorCollection);
    }
  }

  return entries;
};

const getTopLevelFieldKey = (path: string): string => {
  if (!path) {
    return "";
  }

  const firstSegment = path.includes("/")
    ? path.split("/")[0]
    : path.split(".")[0];

  return firstSegment.replace(/^"+|"+$/g, "");
};

const translateValidationErrorCode = (error: ErrorDescriptor): string => {
  const { code, values = [] } = error;
  const [constraintValue] = values;

  if (code === ERROR_MESSAGE_CONSTANTS.MISSING) {
    return "This field is required";
  }

  if (code === ERROR_MESSAGE_CONSTANTS.VALUE_DOES_NOT_MATCH_PATTERN) {
    return "Value does not match required pattern";
  }

  if (code === ERROR_MESSAGE_CONSTANTS.INVALID_PATTERN) {
    return "Value does not match required pattern";
  }

  if (code === ERROR_MESSAGE_CONSTANTS.VALUE_BELOW_MINIMUM) {
    return `Value must be at least ${constraintValue ?? "the minimum"}`;
  }

  if (code === ERROR_MESSAGE_CONSTANTS.VALUE_ABOVE_MAXIMUM) {
    return `Value must be at most ${constraintValue ?? "the maximum"}`;
  }

  if (code === ERROR_MESSAGE_CONSTANTS.NONE) {
    return "";
  }

  if (typeof code === "string" && code.trim()) {
    return code;
  }

  return "Invalid value";
};
