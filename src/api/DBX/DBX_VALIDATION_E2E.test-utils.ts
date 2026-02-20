import type { TypeInfoValidationResults } from "../../common/TypeParsing/Validation";
import {
  ERROR_MESSAGE_CONSTANTS,
  getArrayItemErrorMap,
  getErrorDescriptors,
  PRIMITIVE_ERROR_MESSAGE_CONSTANTS,
} from "../../common/TypeParsing/Validation";
import { TypeInfoORMServiceError } from "../../common/TypeInfoORM";
import { runDbxRequest } from "./DBXRequest";
import { createDbxRuntime } from "./DBXRuntime";
import { DBX_TYPE_INFO_MAP } from "./DBXScenarioConfig";

type Author = {
  id: string;
  name: string;
  handle: string;
  role: "admin" | "editor" | "viewer";
  posts?: string[];
};

type Post = {
  id: string;
  title: string;
  body: string;
  status: "draft" | "published" | "archived";
  score: number;
  createdAt: string;
  tags?: string[];
  author?: string;
};

type ErrorBody = {
  status?: string;
  message?: string;
  error?: TypeInfoValidationResults;
};

const buildDbxRuntime = () => {
  let authorCounter = 0;
  let postCounter = 0;

  return createDbxRuntime({
    typeInfoMap: DBX_TYPE_INFO_MAP,
    idGeneratorsByType: {
      Author: () => `author-${++authorCounter}`,
      Post: () => `post-${++postCounter}`,
    },
    errorShouldBeExposedToClient: () => true,
  });
};

const summarizeError = (
  response: Awaited<ReturnType<typeof runDbxRequest>>,
  keys: string[],
) => {
  const parsed = response.parsedBody as ErrorBody | undefined;
  const errorMap = parsed?.error?.errorMap ?? {};
  const normalizeErrorCodes = (key: string): string[] | undefined => {
    const entries = errorMap[key];
    if (Array.isArray(entries)) {
      const descriptors = getErrorDescriptors(entries);
      if (descriptors.length) {
        return descriptors.map((descriptor) => descriptor.code);
      }
    }

    const [rawFieldKey, rawIndex] = key.split("/");
    const normalizedFieldKey = rawFieldKey?.replace(/^"+|"+$/g, "");
    const index = Number(rawIndex);

    if (Number.isInteger(index)) {
      const candidateFieldKeys = [rawFieldKey, normalizedFieldKey].filter(
        (v): v is string => typeof v === "string" && v.length > 0,
      );

      for (const fieldKey of candidateFieldKeys) {
        if (!Array.isArray(errorMap[fieldKey])) {
          continue;
        }
        const itemErrors = getArrayItemErrorMap(errorMap[fieldKey])[index];
        if (itemErrors?.length) {
          return itemErrors.map((descriptor) => descriptor.code);
        }
      }
    }

    return undefined;
  };

  return {
    statusCode: response.statusCode,
    status: parsed?.status,
    error: parsed?.error?.error?.code,
    errorMap: keys.reduce((acc, key) => {
      const value = normalizeErrorCodes(key);
      if (value) {
        acc[key] = value;
      }
      return acc;
    }, {} as Record<string, string[]>),
  };
};

const runDbxValidationScenario = async () => {
  const runtime = buildDbxRuntime();

  const invalidFieldCreate = await runDbxRequest(runtime, {
    method: "POST",
    path: "create",
    args: [
      "Post",
      {
        title: "Bad Post",
        body: "Bad",
        status: "draft",
        score: 10,
        createdAt: "2024-06-01T00:00:00.000Z",
        unknownField: "nope",
      },
    ],
  });

  const invalidTypeCreate = await runDbxRequest(runtime, {
    method: "POST",
    path: "create",
    args: [
      "Post",
      {
        title: "Type Chaos",
        body: "Bad types",
        status: false,
        score: "high",
        createdAt: 123,
      },
    ],
  });

  const invalidRelationshipAuthorCreate = await runDbxRequest(runtime, {
    method: "POST",
    path: "create",
    args: [
      "Author",
      {
        name: "Rel Author",
        handle: "rel",
        role: "admin",
        posts: ["post-1"],
      } as Author,
    ],
  });

  const invalidRelationshipPostCreate = await runDbxRequest(runtime, {
    method: "POST",
    path: "create",
    args: [
      "Post",
      {
        title: "Rel Post",
        body: "Bad rel",
        status: "draft",
        score: 5,
        createdAt: "2024-06-02T00:00:00.000Z",
        author: "author-1",
      } as Post,
    ],
  });

  const invalidUpdateMissingId = await runDbxRequest(runtime, {
    method: "POST",
    path: "update",
    args: [
      "Post",
      {
        title: "Missing id",
      },
    ],
  });

  const invalidUpdateUnknownField = await runDbxRequest(runtime, {
    method: "POST",
    path: "update",
    args: [
      "Post",
      {
        id: "post-1",
        nope: 123,
      },
    ],
  });

  const invalidUpdateRelationshipField = await runDbxRequest(runtime, {
    method: "POST",
    path: "update",
    args: [
      "Post",
      {
        id: "post-1",
        author: "author-1",
      },
    ],
  });

  const invalidUpdateTypeMismatch = await runDbxRequest(runtime, {
    method: "POST",
    path: "update",
    args: [
      "Post",
      {
        id: "post-1",
        score: "low",
      },
    ],
  });

  return {
    invalidFieldCreate: summarizeError(invalidFieldCreate, ["unknownField"]),
    invalidTypeCreate: summarizeError(invalidTypeCreate, [
      "score",
      "status",
      "createdAt",
    ]),
    invalidRelationshipAuthorCreate: summarizeError(
      invalidRelationshipAuthorCreate,
      ["\"posts\"/\"0\""],
    ),
    invalidRelationshipPostCreate: summarizeError(invalidRelationshipPostCreate, [
      "author",
    ]),
    invalidUpdateMissingId: summarizeError(invalidUpdateMissingId, []),
    invalidUpdateUnknownField: summarizeError(invalidUpdateUnknownField, [
      "nope",
    ]),
    invalidUpdateRelationshipField: summarizeError(
      invalidUpdateRelationshipField,
      ["author"],
    ),
    invalidUpdateTypeMismatch: summarizeError(invalidUpdateTypeMismatch, [
      "score",
    ]),
    expectedErrors: {
      invalidField: ERROR_MESSAGE_CONSTANTS.INVALID_FIELD,
      invalidType: ERROR_MESSAGE_CONSTANTS.INVALID_TYPE,
      notANumber: PRIMITIVE_ERROR_MESSAGE_CONSTANTS.number,
      notAString: PRIMITIVE_ERROR_MESSAGE_CONSTANTS.string,
      relationshipExcluded:
        ERROR_MESSAGE_CONSTANTS.RELATIONSHIP_VALUES_ARE_STRICTLY_EXCLUDED,
      missingPrimaryField: TypeInfoORMServiceError.NO_PRIMARY_FIELD_VALUE_SUPPLIED,
    },
  };
};

export const runDbxValidationInvalidFieldCreateScenario = async () =>
  (await runDbxValidationScenario()).invalidFieldCreate;

export const runDbxValidationInvalidTypeCreateScenario = async () =>
  (await runDbxValidationScenario()).invalidTypeCreate;

export const runDbxValidationInvalidRelationshipAuthorCreateScenario = async () =>
  (await runDbxValidationScenario()).invalidRelationshipAuthorCreate;

export const runDbxValidationInvalidRelationshipPostCreateScenario = async () =>
  (await runDbxValidationScenario()).invalidRelationshipPostCreate;

export const runDbxValidationInvalidUpdateMissingIdScenario = async () =>
  (await runDbxValidationScenario()).invalidUpdateMissingId;

export const runDbxValidationInvalidUpdateUnknownFieldScenario = async () =>
  (await runDbxValidationScenario()).invalidUpdateUnknownField;

export const runDbxValidationInvalidUpdateRelationshipFieldScenario = async () =>
  (await runDbxValidationScenario()).invalidUpdateRelationshipField;

export const runDbxValidationInvalidUpdateTypeMismatchScenario = async () =>
  (await runDbxValidationScenario()).invalidUpdateTypeMismatch;

export const runDbxValidationExpectedErrorsScenario = async () =>
  (await runDbxValidationScenario()).expectedErrors;
