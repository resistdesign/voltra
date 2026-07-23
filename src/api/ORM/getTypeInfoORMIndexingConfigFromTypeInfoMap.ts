import type { TypeInfoMap } from "../../common/TypeParsing/TypeInfo";
import type { TypeInfoORMIndexingConfig } from "./TypeInfoORMService";
import type { StructuredOccupancyFieldMap } from "../Indexing/structured/StructuredOccupancy";

/**
 * Base indexing config accepted by {@link getTypeInfoORMIndexingConfigFromTypeInfoMap}.
 *
 * The utility derives only field lists from `TypeInfo` tags. Concrete backends,
 * readers, writers, and other runtime dependencies must be supplied here when
 * a tagged field requires that indexing mode.
 */
export type TypeInfoORMIndexingConfigSeed = Omit<
  TypeInfoORMIndexingConfig,
  "fullText" | "structured"
> & {
  /**
   * Optional full-text runtime dependencies and existing field map.
   */
  fullText?: TypeInfoORMIndexingConfig["fullText"];
  /**
   * Optional structured runtime dependencies and existing field map.
   */
  structured?: TypeInfoORMIndexingConfig["structured"];
};

const dedupeFieldNames = (fieldNames: string[]): string[] => {
  const seen = new Set<string>();
  const deduped: string[] = [];

  for (const fieldName of fieldNames) {
    if (typeof fieldName !== "string") {
      continue;
    }

    const trimmed = fieldName.trim();

    if (!trimmed || seen.has(trimmed)) {
      continue;
    }

    seen.add(trimmed);
    deduped.push(trimmed);
  }

  return deduped;
};

const normalizeFieldMap = (
  fieldMap?: Record<string, string | string[]>,
): Record<string, string[]> => {
  const normalized: Record<string, string[]> = {};

  if (!fieldMap) {
    return normalized;
  }

  for (const [typeName, configuredFieldNames] of Object.entries(fieldMap)) {
    const values = Array.isArray(configuredFieldNames)
      ? configuredFieldNames
      : [configuredFieldNames];
    const deduped = dedupeFieldNames(values);

    if (deduped.length > 0) {
      normalized[typeName] = deduped;
    }
  }

  return normalized;
};

const mergeFieldMaps = (
  existing: Record<string, string[]>,
  generated: Record<string, string[]>,
): Record<string, string[]> => {
  const merged: Record<string, string[]> = { ...existing };

  for (const [typeName, generatedFieldNames] of Object.entries(generated)) {
    merged[typeName] = dedupeFieldNames([
      ...(existing[typeName] ?? []),
      ...generatedFieldNames,
    ]);
  }

  return merged;
};

const hasIndexedFields = (fieldMap: Record<string, string[]>): boolean =>
  Object.keys(fieldMap).length > 0;

/**
 * Derive ORM indexing field configuration from `TypeInfoField.tags.indexed`.
 *
 * The returned config preserves the supplied runtime dependencies and merges
 * any generated field names into existing `fullText.defaultIndexFieldByType`
 * and `structured.indexedFieldsByType` entries.
 *
 * @param typeInfoMap Type definitions to scan for indexing tags.
 * @param baseConfig Runtime indexing dependencies and any existing field lists.
 * @returns ORM indexing config with generated field lists merged in.
 */
export const getTypeInfoORMIndexingConfigFromTypeInfoMap = (
  typeInfoMap: TypeInfoMap,
  baseConfig: TypeInfoORMIndexingConfigSeed = {},
): TypeInfoORMIndexingConfig => {
  const generatedFullText: Record<string, string[]> = {};
  const generatedStructured: Record<string, string[]> = {};
  const generatedOccupancy: Record<string, StructuredOccupancyFieldMap> = {};

  for (const [typeName, typeInfo] of Object.entries(typeInfoMap)) {
    const fields = typeInfo.fields ?? {};

    for (const [fieldName, field] of Object.entries(fields)) {
      const indexed = field.tags?.indexed;

      if (indexed?.fullText) {
        generatedFullText[typeName] = [
          ...(generatedFullText[typeName] ?? []),
          fieldName,
        ];
      }

      if (indexed?.structured) {
        generatedStructured[typeName] = [
          ...(generatedStructured[typeName] ?? []),
          fieldName,
        ];

        if (
          !field.array &&
          !field.typeReference &&
          (field.type === "string" || field.type === "number")
        ) {
          generatedOccupancy[typeName] = {
            ...(generatedOccupancy[typeName] ?? {}),
            [fieldName]: {
              type: field.type,
              ...(field.type === "number" && indexed.decimal
                ? { decimal: true }
                : {}),
            },
          };
        }
      }
    }
  }

  if (hasIndexedFields(generatedFullText) && !baseConfig.fullText?.backend) {
    throw new Error(
      "Cannot generate fullText indexing config from tags without fullText.backend.",
    );
  }

  if (hasIndexedFields(generatedStructured) && !baseConfig.structured?.reader) {
    throw new Error(
      "Cannot generate structured indexing config from tags without structured.reader.",
    );
  }

  const mergedFullTextByType = mergeFieldMaps(
    normalizeFieldMap(baseConfig.fullText?.defaultIndexFieldByType),
    generatedFullText,
  );
  const mergedStructuredByType = mergeFieldMaps(
    normalizeFieldMap(baseConfig.structured?.indexedFieldsByType),
    generatedStructured,
  );

  return {
    ...baseConfig,
    fullText: baseConfig.fullText
      ? {
          ...baseConfig.fullText,
          ...(hasIndexedFields(mergedFullTextByType)
            ? { defaultIndexFieldByType: mergedFullTextByType }
            : {}),
        }
      : undefined,
    structured: baseConfig.structured
      ? {
          ...baseConfig.structured,
          ...(hasIndexedFields(mergedStructuredByType)
            ? { indexedFieldsByType: mergedStructuredByType }
            : {}),
          occupancyFieldsByType: {
            ...(baseConfig.structured.occupancyFieldsByType ?? {}),
            ...Object.fromEntries(
              Object.entries(generatedOccupancy).map(([typeName, fields]) => [
                typeName,
                {
                  ...(baseConfig.structured?.occupancyFieldsByType?.[
                    typeName
                  ] ?? {}),
                  ...fields,
                },
              ]),
            ),
          },
        }
      : undefined,
  };
};
