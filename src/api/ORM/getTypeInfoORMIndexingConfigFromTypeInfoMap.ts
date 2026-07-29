import type { TypeInfoMap } from "../../common/TypeParsing/TypeInfo";
import type {
  IndexedFieldCapabilities,
  IndexedFieldsByType,
} from "../Indexing/query";
import type { TypeInfoORMIndexingConfig } from "./TypeInfoORMService";

/** Runtime backend/config seed for TypeInfo capability generation. */
export type TypeInfoORMIndexingConfigSeed = Omit<
  TypeInfoORMIndexingConfig,
  "fieldsByType"
> & {
  /** Explicit capabilities merged with generated TypeInfo capabilities. */
  fieldsByType?: IndexedFieldsByType;
};

const mergeCapability = (
  existing: IndexedFieldCapabilities | undefined,
  generated: IndexedFieldCapabilities,
): IndexedFieldCapabilities => ({
  ...existing,
  ...generated,
  range:
    existing?.range || generated.range
      ? ({
          ...existing?.range,
          ...generated.range,
        } as IndexedFieldCapabilities["range"])
      : undefined,
  text:
    existing?.text || generated.text
      ? { ...existing?.text, ...generated.text }
      : undefined,
});

/**
 * Derive the singular indexed field capability registry from TypeInfo tags.
 *
 * The same registry drives expression compilation, physical index mutation,
 * ordering, and occupancy planning.
 */
export const getTypeInfoORMIndexingConfigFromTypeInfoMap = (
  typeInfoMap: TypeInfoMap,
  baseConfig: TypeInfoORMIndexingConfigSeed,
): TypeInfoORMIndexingConfig => {
  if (!baseConfig.backend) {
    throw new Error(
      "Cannot generate indexing capabilities without an indexing backend.",
    );
  }

  const fieldsByType: IndexedFieldsByType = structuredClone(
    baseConfig.fieldsByType ?? {},
  );

  for (const [typeName, typeInfo] of Object.entries(typeInfoMap)) {
    for (const [fieldName, field] of Object.entries(typeInfo.fields ?? {})) {
      const indexed = field.tags?.indexed;
      if (!indexed) continue;

      const generated: IndexedFieldCapabilities = {
        ...(indexed.exact ? { exact: true as const } : {}),
        ...(indexed.membership || (field.array && indexed.exact)
          ? { membership: true as const }
          : {}),
        ...(indexed.range &&
        !field.array &&
        !field.typeReference &&
        (field.type === "string" || field.type === "number")
          ? {
              range: {
                valueType: field.type,
                ...(field.type === "number" && indexed.decimal
                  ? { decimal: true as const }
                  : {}),
              },
            }
          : {}),
        ...(indexed.text && field.type === "string" && !field.array
          ? {
              text: {
                caseInsensitiveEquals: true as const,
                caseInsensitiveContains: true as const,
                exact: true as const,
                phrase: true as const,
                prefix: true as const,
                lossy: true as const,
              },
            }
          : {}),
        ...(field.optional ? { optional: true as const } : {}),
      };

      if (
        !generated.exact &&
        !generated.membership &&
        !generated.range &&
        !generated.text
      ) {
        continue;
      }
      fieldsByType[typeName] = fieldsByType[typeName] ?? {};
      fieldsByType[typeName][fieldName] = mergeCapability(
        fieldsByType[typeName][fieldName],
        generated,
      );
    }
  }

  return { ...baseConfig, fieldsByType };
};
