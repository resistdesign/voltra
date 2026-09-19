import {
  TypeInfoORMService,
  addMCPToRouteMap,
  type BaseTypeInfoORMServiceConfig,
  type MCPJSONSchema,
  type RouteMap,
} from "../../src/api";
import {
  ComparisonOperators,
  LogicalOperators,
  type ListItemsConfig,
} from "../../src/common";
import { DEMO_MCP_ROUTE_PATH } from "../common/Constants";

const PERSON_FIELDS = [
  "id",
  "firstName",
  "lastName",
  "age",
  "dietaryRestrictions",
  "likesCheese",
];

const CAR_FIELDS = ["id", "make", "model", "year"];

const PAGING_SCHEMA_PROPERTIES = {
  itemsPerPage: {
    type: "integer",
    minimum: 1,
    maximum: 20,
    default: 5,
    description: "Maximum number of items to return.",
  },
  cursor: {
    type: "string",
    description: "Cursor returned by a previous call.",
  },
};

const PERSON_SCHEMA: MCPJSONSchema = {
  type: "object",
  properties: {
    id: { type: "string" },
    firstName: { type: "string" },
    lastName: { type: "string" },
    age: { type: "number" },
    dietaryRestrictions: { type: "string" },
    likesCheese: { type: "boolean" },
  },
  additionalProperties: false,
};

const CAR_SCHEMA: MCPJSONSchema = {
  type: "object",
  properties: {
    id: { type: "string" },
    make: { type: "string" },
    model: { type: "string" },
    year: { type: "number" },
  },
  additionalProperties: false,
};

const LIST_PEOPLE_INPUT_SCHEMA: MCPJSONSchema = {
  type: "object",
  properties: PAGING_SCHEMA_PROPERTIES,
  additionalProperties: false,
};

const LIST_PEOPLE_OUTPUT_SCHEMA: MCPJSONSchema = {
  type: "object",
  properties: {
    items: {
      type: "array",
      items: PERSON_SCHEMA,
    },
    cursor: {
      type: "string",
    },
  },
  required: ["items"],
  additionalProperties: false,
};

const GET_PERSON_INPUT_SCHEMA: MCPJSONSchema = {
  type: "object",
  properties: {
    id: {
      type: "string",
      description: "Person ID.",
    },
  },
  required: ["id"],
  additionalProperties: false,
};

const SEARCH_CARS_INPUT_SCHEMA: MCPJSONSchema = {
  type: "object",
  properties: {
    query: {
      type: "string",
      minLength: 1,
      description: "Text to search for.",
    },
    field: {
      type: "string",
      enum: ["make", "model"],
      default: "model",
      description: "Car field to search.",
    },
    ...PAGING_SCHEMA_PROPERTIES,
  },
  required: ["query"],
  additionalProperties: false,
};

const SEARCH_CARS_OUTPUT_SCHEMA: MCPJSONSchema = {
  type: "object",
  properties: {
    items: {
      type: "array",
      items: CAR_SCHEMA,
    },
    cursor: {
      type: "string",
    },
  },
  required: ["items"],
  additionalProperties: false,
};

const READ_ONLY_ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

type PagingInput = {
  itemsPerPage?: number;
  cursor?: string;
};

type GetPersonInput = {
  id: string;
};

type SearchCarsInput = PagingInput & {
  query: string;
  field?: "make" | "model";
};

const getPagingConfig = (input: PagingInput): ListItemsConfig => {
  const config: ListItemsConfig = {
    itemsPerPage: input.itemsPerPage ?? 5,
  };

  if (input.cursor) {
    config.cursor = input.cursor;
  }

  return config;
};

/**
 * Add the public, read-only demo MCP endpoint to a RouteMap.
 */
export const addDemoMCPToRouteMap = (
  routeMap: RouteMap,
  ormConfig: BaseTypeInfoORMServiceConfig,
): RouteMap => {
  const orm = new TypeInfoORMService({
    ...ormConfig,
    useDAC: false,
  });

  return addMCPToRouteMap(routeMap, {
    path: DEMO_MCP_ROUTE_PATH,
    name: "Voltra Demo",
    version: "1.0.0",
    authConfig: {
      public: true,
    },
    tools: [
      {
        name: "listPeople",
        description:
          "List people from the Voltra demo application. Returns safe demo profile fields and supports cursor paging.",
        inputSchema: LIST_PEOPLE_INPUT_SCHEMA,
        outputSchema: LIST_PEOPLE_OUTPUT_SCHEMA,
        annotations: READ_ONLY_ANNOTATIONS,
        handler: async (input: PagingInput) =>
          orm.list("Person", getPagingConfig(input), PERSON_FIELDS),
      },
      {
        name: "getPerson",
        description:
          "Read one person from the Voltra demo application by person ID.",
        inputSchema: GET_PERSON_INPUT_SCHEMA,
        outputSchema: PERSON_SCHEMA,
        annotations: READ_ONLY_ANNOTATIONS,
        handler: async (input: GetPersonInput) =>
          orm.read("Person", input.id, PERSON_FIELDS),
      },
      {
        name: "searchCars",
        description:
          "Search demo cars by make or model using Voltra ORM text indexing.",
        inputSchema: SEARCH_CARS_INPUT_SCHEMA,
        outputSchema: SEARCH_CARS_OUTPUT_SCHEMA,
        annotations: READ_ONLY_ANNOTATIONS,
        handler: async (input: SearchCarsInput) => {
          const config = getPagingConfig(input);
          const fieldName = input.field === "make" ? "make" : "model";

          config.criteria = {
            logicalOperator: LogicalOperators.AND,
            fieldCriteria: [
              {
                fieldName,
                operator: ComparisonOperators.LIKE,
                value: input.query.trim(),
              },
            ],
          };

          return orm.list("Car", config, CAR_FIELDS);
        },
      },
    ],
  });
};
