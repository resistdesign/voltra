import type {
  ListItemsResults,
  SearchCriteria,
} from "../../common/SearchTypes";
import {
  ComparisonOperators,
  LogicalOperators,
} from "../../common/SearchTypes";
import { runDbxRequest } from "./DBXRequest";
import { createDbxRuntime } from "./DBXRuntime";
import { DBX_TYPE_INFO_MAP } from "./DBXScenarioConfig";
import { FullTextMemoryBackend } from "../Indexing";

type Author = {
  id: string;
  lastName?: string;
  score?: number;
};

type Customer = {
  id: string;
  lastName?: string;
  score?: number;
};

const buildDbxRuntime = () => {
  let authorCounter = 0;
  let customerCounter = 0;

  return createDbxRuntime({
    typeInfoMap: DBX_TYPE_INFO_MAP,
    idGeneratorsByType: {
      Author: () => `author-${++authorCounter}`,
      Customer: () => `customer-${++customerCounter}`,
    },
    indexing: {
      fullText: {
        backend: new FullTextMemoryBackend(),
        defaultIndexFieldByType: {
          Author: "lastName",
          Customer: "lastName",
        },
      },
    },
  });
};

const buildAuthors = (): Array<Omit<Author, "id">> => [
  { lastName: "Adams", score: 10 },
  { lastName: "Baker", score: 20 },
];

const buildCustomers = (): Array<Omit<Customer, "id">> => [
  { lastName: "Adams", score: 10 },
  { lastName: "Clark", score: 30 },
];

const listIds = <T extends { id: string }>(results?: ListItemsResults<T>) =>
  (results?.items ?? []).map((item) => item.id);

const runStructuredSearch = async <T extends Record<any, any>>(
  runtime: ReturnType<typeof buildDbxRuntime>,
  typeName: "Author" | "Customer",
  criteria: SearchCriteria,
) => {
  const response = await runDbxRequest<ListItemsResults<T>>(runtime, {
    method: "POST",
    path: "list",
    args: [
      typeName,
      {
        itemsPerPage: 10,
        criteria,
      },
    ],
  });

  return response.parsedBody as ListItemsResults<T>;
};

const runFullTextSearch = async <T extends Record<any, any>>(
  runtime: ReturnType<typeof buildDbxRuntime>,
  typeName: "Author" | "Customer",
  query: string,
) => {
  const response = await runDbxRequest<ListItemsResults<T>>(runtime, {
    method: "POST",
    path: "list",
    args: [
      typeName,
      {
        itemsPerPage: 10,
        text: {
          query,
          mode: "lossy",
          indexField: "lastName",
        },
      },
    ],
  });

  return response.parsedBody as ListItemsResults<T>;
};

const runDbxIndexCollisionScenario = async () => {
  const runtime = buildDbxRuntime();
  const authorIds: string[] = [];
  const customerIds: string[] = [];

  for (const author of buildAuthors()) {
    const response = await runDbxRequest<string>(runtime, {
      method: "POST",
      path: "create",
      args: ["Author", author],
    });
    authorIds.push(response.parsedBody as string);
  }

  for (const customer of buildCustomers()) {
    const response = await runDbxRequest<string>(runtime, {
      method: "POST",
      path: "create",
      args: ["Customer", customer],
    });
    customerIds.push(response.parsedBody as string);
  }

  const authorLastNameResults = await runStructuredSearch<Author>(runtime, "Author", {
    logicalOperator: LogicalOperators.AND,
    fieldCriteria: [
      {
        fieldName: "lastName",
        operator: ComparisonOperators.EQUALS,
        value: "Adams",
      },
    ],
  });

  const customerLastNameResults = await runStructuredSearch<Customer>(
    runtime,
    "Customer",
    {
      logicalOperator: LogicalOperators.AND,
      fieldCriteria: [
        {
          fieldName: "lastName",
          operator: ComparisonOperators.EQUALS,
          value: "Adams",
        },
      ],
    },
  );

  const authorScoreResults = await runStructuredSearch<Author>(runtime, "Author", {
    logicalOperator: LogicalOperators.AND,
    fieldCriteria: [
      {
        fieldName: "score",
        operator: ComparisonOperators.GREATER_THAN_OR_EQUAL,
        value: 10,
      },
    ],
  });

  const authorFullTextResults = await runFullTextSearch<Author>(
    runtime,
    "Author",
    "Adams",
  );

  const customerFullTextResults = await runFullTextSearch<Customer>(
    runtime,
    "Customer",
    "Adams",
  );

  return {
    createdAuthorIds: authorIds,
    createdCustomerIds: customerIds,
    structuredAuthorLastNameIds: listIds(authorLastNameResults),
    structuredCustomerLastNameIds: listIds(customerLastNameResults),
    structuredAuthorScoreIds: listIds(authorScoreResults),
    fullTextAuthorLastNameIds: listIds(authorFullTextResults),
    fullTextCustomerLastNameIds: listIds(customerFullTextResults),
  };
};

export const runDbxIndexCollisionCreatedAuthorIdsScenario = async () =>
  (await runDbxIndexCollisionScenario()).createdAuthorIds;

export const runDbxIndexCollisionCreatedCustomerIdsScenario = async () =>
  (await runDbxIndexCollisionScenario()).createdCustomerIds;

export const runDbxIndexCollisionStructuredAuthorLastNameIdsScenario = async () =>
  (await runDbxIndexCollisionScenario()).structuredAuthorLastNameIds;

export const runDbxIndexCollisionStructuredCustomerLastNameIdsScenario = async () =>
  (await runDbxIndexCollisionScenario()).structuredCustomerLastNameIds;

export const runDbxIndexCollisionStructuredAuthorScoreIdsScenario = async () =>
  (await runDbxIndexCollisionScenario()).structuredAuthorScoreIds;

export const runDbxIndexCollisionFullTextAuthorLastNameIdsScenario = async () =>
  (await runDbxIndexCollisionScenario()).fullTextAuthorLastNameIds;

export const runDbxIndexCollisionFullTextCustomerLastNameIdsScenario = async () =>
  (await runDbxIndexCollisionScenario()).fullTextCustomerLastNameIds;
