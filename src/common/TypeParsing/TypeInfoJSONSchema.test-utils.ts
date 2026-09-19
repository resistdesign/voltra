import type { TypeInfoMap } from "./TypeInfo";
import { getJSONSchemaFromTypeInfoPack } from "./TypeInfoJSONSchema";

const TYPE_INFO_MAP: TypeInfoMap = {
  Address: {
    fields: {
      street: {
        type: "string",
        array: false,
        readonly: false,
        optional: false,
      },
      zip: {
        type: "string",
        array: false,
        readonly: false,
        optional: false,
        tags: {
          constraints: {
            pattern: "^\\d{5}$",
          },
        },
      },
    },
  },
  Request: {
    fields: {
      id: {
        type: "string",
        array: false,
        readonly: true,
        optional: true,
      },
      name: {
        type: "string",
        array: false,
        readonly: false,
        optional: false,
        tags: {
          label: "Name",
          constraints: {
            pattern: "^[A-Z]",
          },
        },
      },
      count: {
        type: "number",
        array: false,
        readonly: false,
        optional: true,
        tags: {
          constraints: {
            min: 1,
            max: 20,
            defaultValue: 5,
          },
        },
      },
      tags: {
        type: "string",
        array: true,
        readonly: false,
        optional: false,
      },
      mode: {
        type: "string",
        array: false,
        readonly: false,
        optional: false,
        possibleValues: ["fast", "safe"],
      },
      region: {
        type: "string",
        array: false,
        readonly: false,
        optional: false,
        possibleValues: ["US", "CA"],
        possibleValuesExhaustive: false,
      },
      email: {
        type: "string",
        array: false,
        readonly: false,
        optional: true,
        tags: {
          format: "email",
        },
      },
      address: {
        type: "string",
        typeReference: "Address",
        array: false,
        readonly: false,
        optional: true,
      },
      addresses: {
        type: "string",
        typeReference: "Address",
        array: true,
        readonly: false,
        optional: true,
      },
    },
  },
  UnionRequest: {
    fields: {
      byId: {
        type: "string",
        array: false,
        readonly: false,
        optional: true,
      },
      byEmail: {
        type: "string",
        array: false,
        readonly: false,
        optional: true,
      },
    },
    unionFieldSets: [["byId"], ["byEmail"]],
  },
};

export const runTypeInfoJSONSchemaScenario = () => {
  const schema = getJSONSchemaFromTypeInfoPack({
    entryTypeName: "Request",
    typeInfoMap: TYPE_INFO_MAP,
  });
  const properties = schema.properties;
  const definitions = schema.$defs;

  return {
    draft: schema.$schema,
    type: schema.type,
    additionalProperties: schema.additionalProperties,
    required: schema.required,
    nameTitle: properties.name.title,
    namePattern: properties.name.pattern,
    countMinimum: properties.count.minimum,
    countMaximum: properties.count.maximum,
    countDefault: properties.count.default,
    tagsType: properties.tags.type,
    tagsItemType: properties.tags.items.type,
    tagsMinItems: properties.tags.minItems,
    modeEnum: properties.mode.enum,
    regionType: properties.region.type,
    regionHasEnum: Object.prototype.hasOwnProperty.call(
      properties.region,
      "enum",
    ),
    emailFormat: properties.email.format,
    addressRef: properties.address.$ref,
    addressesItemRef: properties.addresses.items.$ref,
    idReadOnly: properties.id.readOnly,
    definitionNames: Object.keys(definitions).sort(),
    zipPattern: definitions.Address.properties.zip.pattern,
  };
};

export const runTypeInfoJSONSchemaUnionScenario = () => {
  const schema = getJSONSchemaFromTypeInfoPack({
    entryTypeName: "UnionRequest",
    typeInfoMap: TYPE_INFO_MAP,
  });

  return schema.anyOf;
};

export const runTypeInfoJSONSchemaMissingEntryScenario = () => {
  let message = "";

  try {
    getJSONSchemaFromTypeInfoPack({
      entryTypeName: "Missing",
      typeInfoMap: TYPE_INFO_MAP,
    });
  } catch (error) {
    message = error instanceof Error ? error.message : String(error);
  }

  return message;
};
