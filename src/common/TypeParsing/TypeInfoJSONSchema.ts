/**
 * @packageDocumentation
 *
 * JSON Schema generation for Voltra TypeInfo definitions.
 */
import type {
  TypeInfo,
  TypeInfoField,
  TypeInfoMap,
  TypeInfoPack,
} from "./TypeInfo";

/**
 * JSON Schema generated from Voltra TypeInfo metadata.
 */
export type TypeInfoJSONSchema = Record<string, any>;

const JSON_SCHEMA_2020_12 =
  "https://json-schema.org/draft/2020-12/schema";

const JSON_SCHEMA_FORMATS = new Set([
  "date-time",
  "date",
  "time",
  "duration",
  "email",
  "hostname",
  "ipv4",
  "ipv6",
  "uuid",
  "uri",
  "uri-reference",
  "iri",
  "iri-reference",
  "uri-template",
  "json-pointer",
  "relative-json-pointer",
  "regex",
]);

const escapeJSONPointerSegment = (value: string): string =>
  value.replace(/~/g, "~0").replace(/\//g, "~1");

const getTypeReferenceSchema = (
  typeReference: string,
): TypeInfoJSONSchema => ({
  $ref: `#/$defs/${escapeJSONPointerSegment(typeReference)}`,
});

const getFieldValueSchema = (
  field: TypeInfoField,
): TypeInfoJSONSchema => {
  const {
    type,
    typeReference,
    possibleValues,
    possibleValuesExhaustive,
    tags: {
      constraints: {
        min,
        max,
        pattern,
      } = {},
      format,
    } = {},
  } = field;
  const patternIsAuthoritative =
    type === "string" &&
    typeof pattern === "string" &&
    pattern.trim() !== "";
  const possibleValuesAreRestrictive =
    Array.isArray(possibleValues) &&
    possibleValues.length > 0 &&
    possibleValuesExhaustive !== false &&
    !patternIsAuthoritative;
  let schema: TypeInfoJSONSchema;

  if (typeReference) {
    schema = getTypeReferenceSchema(typeReference);
  } else if (possibleValuesAreRestrictive) {
    schema = {
      enum: possibleValues,
    };
  } else {
    schema = {
      type,
    };
  }

  if (!typeReference) {
    if (type === "string") {
      if (patternIsAuthoritative) {
        schema.pattern = pattern;
      }

      if (typeof format === "string" && JSON_SCHEMA_FORMATS.has(format)) {
        schema.format = format;
      }
    } else if (type === "number") {
      if (typeof min === "number") {
        schema.minimum = min;
      }

      if (typeof max === "number") {
        schema.maximum = max;
      }
    }
  }

  return schema;
};

const getFieldSchema = (
  field: TypeInfoField,
): TypeInfoJSONSchema => {
  const {
    array,
    readonly,
    optional,
    tags: {
      label,
      constraints: {
        defaultValue,
      } = {},
      validation: {
        emptyArrayIsValid,
      } = {},
    } = {},
  } = field;
  const valueSchema = getFieldValueSchema(field);
  let schema: TypeInfoJSONSchema = array
    ? {
        type: "array",
        items: valueSchema,
      }
    : valueSchema;

  if (array && !optional && emptyArrayIsValid !== true) {
    schema.minItems = 1;
  }

  if (typeof label === "string" && label.trim() !== "") {
    schema.title = label;
  }

  if (typeof defaultValue !== "undefined") {
    schema.default = defaultValue;
  }

  if (readonly) {
    schema.readOnly = true;
  }

  return schema;
};

const getObjectProperties = (
  typeInfo: TypeInfo,
): Record<string, TypeInfoJSONSchema> => {
  const properties: Record<string, TypeInfoJSONSchema> = {};
  const fields = typeInfo.fields ?? {};

  for (const fieldName in fields) {
    properties[fieldName] = getFieldSchema(fields[fieldName]);
  }

  return properties;
};

const getRequiredFields = (
  typeInfo: TypeInfo,
  allowedFields?: string[],
): string[] => {
  const requiredFields: string[] = [];
  const fields = typeInfo.fields ?? {};

  for (const fieldName in fields) {
    const field = fields[fieldName];
    const fieldIsAllowed =
      !allowedFields || allowedFields.includes(fieldName);

    if (fieldIsAllowed && !field.optional) {
      requiredFields.push(fieldName);
    }
  }

  return requiredFields;
};

const getUnionSchema = (
  typeInfo: TypeInfo,
  properties: Record<string, TypeInfoJSONSchema>,
): TypeInfoJSONSchema[] | undefined => {
  const { unionFieldSets } = typeInfo;
  let unionSchema: TypeInfoJSONSchema[] | undefined;

  if (unionFieldSets && unionFieldSets.length > 0) {
    unionSchema = [];

    for (const fieldSet of unionFieldSets) {
      const branchProperties: Record<string, TypeInfoJSONSchema> = {};

      for (const fieldName of fieldSet) {
        if (properties[fieldName]) {
          branchProperties[fieldName] = properties[fieldName];
        }
      }

      const required = getRequiredFields(typeInfo, fieldSet);
      const branch: TypeInfoJSONSchema = {
        type: "object",
        properties: branchProperties,
        additionalProperties: false,
      };

      if (required.length > 0) {
        branch.required = required;
      }

      unionSchema.push(branch);
    }
  }

  return unionSchema;
};

const getObjectSchema = (
  typeInfo: TypeInfo,
): TypeInfoJSONSchema => {
  const properties = getObjectProperties(typeInfo);
  const unionSchema = getUnionSchema(typeInfo, properties);
  const schema: TypeInfoJSONSchema = {
    type: "object",
    properties,
    additionalProperties: false,
  };
  const { label } = typeInfo.tags ?? {};

  if (unionSchema) {
    schema.anyOf = unionSchema;
  } else {
    const required = getRequiredFields(typeInfo);

    if (required.length > 0) {
      schema.required = required;
    }
  }

  if (typeof label === "string" && label.trim() !== "") {
    schema.title = label;
  }

  return schema;
};

const getDefinitions = (
  typeInfoMap: TypeInfoMap,
): Record<string, TypeInfoJSONSchema> => {
  const definitions: Record<string, TypeInfoJSONSchema> = {};

  for (const typeName in typeInfoMap) {
    definitions[typeName] = getObjectSchema(typeInfoMap[typeName]);
  }

  return definitions;
};

/**
 * Convert one TypeInfo definition to JSON Schema.
 *
 * Referenced types are resolved from the supplied TypeInfoMap and emitted
 * under `$defs`.
 *
 * @param typeInfo - Entry TypeInfo definition.
 * @param typeInfoMap - Related TypeInfo definitions available to references.
 * @returns Draft 2020-12 JSON Schema.
 */
export const getJSONSchemaFromTypeInfo = (
  typeInfo: TypeInfo,
  typeInfoMap: TypeInfoMap = {},
): TypeInfoJSONSchema => {
  const definitions = getDefinitions(typeInfoMap);
  const schema: TypeInfoJSONSchema = {
    $schema: JSON_SCHEMA_2020_12,
    ...getObjectSchema(typeInfo),
  };

  if (Object.keys(definitions).length > 0) {
    schema.$defs = definitions;
  }

  return schema;
};

/**
 * Convert a TypeInfoPack to JSON Schema using its entry type as the root.
 *
 * @param typeInfoPack - Entry type name and containing TypeInfoMap.
 * @returns Draft 2020-12 JSON Schema for the entry type.
 */
export const getJSONSchemaFromTypeInfoPack = (
  typeInfoPack: TypeInfoPack,
): TypeInfoJSONSchema => {
  const { entryTypeName, typeInfoMap } = typeInfoPack;
  const typeInfo = typeInfoMap[entryTypeName];

  if (!typeInfo) {
    throw new Error(
      `TypeInfo entry type does not exist: ${entryTypeName}`,
    );
  }

  return getJSONSchemaFromTypeInfo(typeInfo, typeInfoMap);
};
