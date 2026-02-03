import type { FC } from "react";
import type { RelationActionPayload } from "../../../../../../src/app/forms";
import { AutoFormView, useFormEngine } from "../../../../../../src/app/forms";
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
    />
  );
};

const extractValidationErrors = (
  error: unknown,
): Record<string, string> | null => {
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

  const fieldErrors: Record<string, string> = {};

  for (const [key, value] of Object.entries(errorMap)) {
    const fieldKey = key.split(".")[0];
    const code = Array.isArray(value) ? value[0] : value;

    if (typeof code === "string") {
      fieldErrors[fieldKey] = getErrorMessage(code);
    }
  }

  return Object.keys(fieldErrors).length ? fieldErrors : null;
};

const getErrorMessage = (code: string) => {
  if (code === ERROR_MESSAGE_CONSTANTS.MISSING) {
    return "This field is required";
  }

  if (code === ERROR_MESSAGE_CONSTANTS.VALUE_DOES_NOT_MATCH_PATTERN) {
    return "Value does not match required pattern";
  }

  if (code === ERROR_MESSAGE_CONSTANTS.INVALID_PATTERN) {
    return "Value does not match required pattern";
  }

  return "Invalid value";
};
