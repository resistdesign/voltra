import { FullTextMemoryBackend } from "../Indexing/fulltext/FullTextMemoryBackend";
import { StructuredInMemoryBackend } from "../Indexing/structured/StructuredInMemoryBackend";
import type { TypeInfoMap } from "../../common/TypeParsing/TypeInfo";
import { getTypeInfoORMIndexingConfigFromTypeInfoMap } from "./getTypeInfoORMIndexingConfigFromTypeInfoMap";
import { createIndexBackend } from "../Indexing/query";

const getScenarioTypeInfoMap = (): TypeInfoMap => ({
  Book: {
    primaryField: "id",
    fields: {
      id: {
        type: "string",
        array: false,
        readonly: false,
        optional: false,
      },
      title: {
        type: "string",
        array: false,
        readonly: false,
        optional: false,
        tags: {
          indexed: {
            text: true,
            exact: true,
            range: true,
          },
        },
      },
      summary: {
        type: "string",
        array: false,
        readonly: false,
        optional: true,
        tags: {
          indexed: {
            text: true,
          },
        },
      },
      rating: {
        type: "number",
        array: false,
        readonly: false,
        optional: true,
        tags: {
          indexed: {
            exact: true,
            range: true,
            decimal: true,
          },
        },
      },
      tags: {
        type: "string",
        array: true,
        readonly: false,
        optional: true,
        tags: {
          indexed: {
            exact: true,
          },
        },
      },
    },
  },
  Person: {
    primaryField: "id",
    fields: {
      id: {
        type: "string",
        array: false,
        readonly: false,
        optional: false,
      },
      bio: {
        type: "string",
        array: false,
        readonly: false,
        optional: true,
      },
      age: {
        type: "number",
        array: false,
        readonly: false,
        optional: true,
      },
    },
  },
});

const runGeneratedConfigScenario = () => {
  const structuredBackend = new StructuredInMemoryBackend();
  const fullTextBackend = new FullTextMemoryBackend();
  const config = getTypeInfoORMIndexingConfigFromTypeInfoMap(
    getScenarioTypeInfoMap(),
    {
      backend: createIndexBackend({
        values: structuredBackend,
        valueWriter: structuredBackend,
        text: fullTextBackend,
      }),
      fieldsByType: {
        Book: {
          title: { field: "bookTitle" },
        },
        Person: {
          bio: { text: { lossy: true } },
          age: { exact: true, range: { valueType: "number" } },
        },
      },
    },
  );

  return {
    fieldsByType: config.fieldsByType,
    preservedValueWriter: config.backend.valueWriter === structuredBackend,
    preservedTextBackend: config.backend.text === fullTextBackend,
  };
};

export const runGeneratedTypeInfoORMIndexingConfigScenario = () =>
  runGeneratedConfigScenario();

export const runGeneratedTypeInfoORMIndexingConfigMissingBackendScenario =
  () => {
    try {
      getTypeInfoORMIndexingConfigFromTypeInfoMap(
        getScenarioTypeInfoMap(),
        {} as any,
      );
    } catch (error: any) {
      return error?.message ?? String(error);
    }

    return "NO_ERROR";
  };
