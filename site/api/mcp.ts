import {
  TypeInfoORMService,
  addMCPToRouteMap,
  type BaseTypeInfoORMServiceConfig,
  type RouteMap,
} from "../../src/api";
import {
  ComparisonOperators,
  LogicalOperators,
  type ListItemsConfig,
  type TypeInfoPack,
} from "../../src/common";
import { DEMO_MCP_ROUTE_PATH } from "../common/Constants";
import { DemoTypeInfoMap } from "../common/DemoTypeInfoMap";
import type {
  MCPDemoGetPersonInput,
  MCPDemoListPeopleInput,
  MCPDemoSearchCarsInput,
} from "../common/Types";

const READ_ONLY_ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

const getDemoTypeInfoPack = (
  entryTypeName: string,
): TypeInfoPack => ({
  entryTypeName,
  typeInfoMap: DemoTypeInfoMap,
});

const getDemoTypeFields = (typeName: string): string[] =>
  Object.keys(DemoTypeInfoMap[typeName]?.fields ?? {});

const PERSON_FIELDS = getDemoTypeFields("MCPDemoPerson");
const CAR_FIELDS = getDemoTypeFields("MCPDemoCar");

const getPagingConfig = (
  input: MCPDemoListPeopleInput,
): ListItemsConfig => {
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
    tools: [
      {
        path: "listPeople",
        authConfig: {
          public: true,
        },
        description:
          "List people from the Voltra demo application. Returns safe demo profile fields and supports cursor paging.",
        inputTypeInfo: getDemoTypeInfoPack("MCPDemoListPeopleInput"),
        outputTypeInfo: getDemoTypeInfoPack("MCPDemoListPeopleOutput"),
        annotations: READ_ONLY_ANNOTATIONS,
        handler: async (input: MCPDemoListPeopleInput) =>
          orm.list("Person", getPagingConfig(input), PERSON_FIELDS),
      },
      {
        path: "getPerson",
        authConfig: {
          public: true,
        },
        description:
          "Read one person from the Voltra demo application by person ID.",
        inputTypeInfo: getDemoTypeInfoPack("MCPDemoGetPersonInput"),
        outputTypeInfo: getDemoTypeInfoPack("MCPDemoPerson"),
        annotations: READ_ONLY_ANNOTATIONS,
        handler: async (input: MCPDemoGetPersonInput) =>
          orm.read("Person", input.id, PERSON_FIELDS),
      },
      {
        path: "searchCars",
        authConfig: {
          public: true,
        },
        description:
          "Search demo cars by make or model using Voltra ORM text indexing.",
        inputTypeInfo: getDemoTypeInfoPack("MCPDemoSearchCarsInput"),
        outputTypeInfo: getDemoTypeInfoPack("MCPDemoSearchCarsOutput"),
        annotations: READ_ONLY_ANNOTATIONS,
        handler: async (input: MCPDemoSearchCarsInput) => {
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
