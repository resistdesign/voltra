import { FullTextMemoryBackend } from "../Indexing/fulltext/FullTextMemoryBackend";
import { StructuredInMemoryBackend } from "../Indexing/structured/StructuredInMemoryBackend";
import type { TypeInfoMap } from "../../common/TypeParsing/TypeInfo";
import { getTypeInfoORMIndexingConfigFromTypeInfoMap } from "./getTypeInfoORMIndexingConfigFromTypeInfoMap";

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
            fullText: true,
            structured: true,
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
            fullText: true,
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
            structured: true,
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
      fullText: {
        backend: fullTextBackend,
        defaultIndexFieldByType: {
          Book: "title",
          Person: ["bio"],
        },
      },
      structured: {
        reader: structuredBackend,
        writer: structuredBackend,
        indexedFieldsByType: {
          Book: ["title"],
          Person: ["age"],
        },
        fieldMapByType: {
          Book: {
            title: "bookTitle",
          },
        },
      },
    },
  );

  return {
    fullTextFieldsByType: config.fullText?.defaultIndexFieldByType,
    structuredFieldsByType: config.structured?.indexedFieldsByType,
    preservedStructuredFieldMap: config.structured?.fieldMapByType,
    preservedStructuredWriter:
      config.structured?.writer === structuredBackend,
    preservedFullTextBackend: config.fullText?.backend === fullTextBackend,
  };
};

export const runGeneratedTypeInfoORMIndexingConfigScenario = () =>
  runGeneratedConfigScenario();

export const runGeneratedTypeInfoORMIndexingConfigMissingFullTextDependencyScenario =
  () => {
    try {
      getTypeInfoORMIndexingConfigFromTypeInfoMap(getScenarioTypeInfoMap(), {
        structured: {
          reader: new StructuredInMemoryBackend(),
        },
      });
    } catch (error: any) {
      return error?.message ?? String(error);
    }

    return "NO_ERROR";
  };

export const runGeneratedTypeInfoORMIndexingConfigMissingStructuredDependencyScenario =
  () => {
    try {
      getTypeInfoORMIndexingConfigFromTypeInfoMap(
        {
          Book: {
            primaryField: "id",
            fields: {
              id: {
                type: "string",
                array: false,
                readonly: false,
                optional: false,
              },
              rating: {
                type: "number",
                array: false,
                readonly: false,
                optional: false,
                tags: {
                  indexed: {
                    structured: true,
                  },
                },
              },
            },
          },
        },
        {
          fullText: {
            backend: new FullTextMemoryBackend(),
          },
        },
      );
    } catch (error: any) {
      return error?.message ?? String(error);
    }

    return "NO_ERROR";
  };
