import { FC, useCallback, useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import type { RelationActionPayload } from "../../../../src/app/forms";
import { AutoFormView, useFormEngine } from "../../../../src/app/forms";
import { TypeInfoORMClient } from "../../../../src/app/utils";
import { getSimpleId } from "../../../../src/common/IdGeneration";
import type { TypeInfoORMAPI } from "../../../../src/common/TypeInfoORM";
import { TypeInfoORMAPIRoutePaths } from "../../../../src/common/TypeInfoORM";
import {
  ComparisonOperators,
  type ListItemsConfig,
  type ListItemsResults,
  type ListRelationshipsConfig,
  LogicalOperators,
} from "../../../../src/common/SearchTypes";
import type { TypeInfo } from "../../../../src/common/TypeParsing/TypeInfo";
import { TypeOperation } from "../../../../src/common/TypeParsing/TypeInfo";
import {
  BASE_DOMAIN,
  DEMO_ORM_ROUTE_PATH,
  DOMAINS,
} from "../../../common/Constants";
import { DemoTypeInfoMap } from "../../../common/DemoTypeInfoMap";
import { BaseItemRelationshipInfo } from "../../../../src/common/ItemRelationshipInfoTypes";

type RequestLogEntry = {
  id: string;
  methodName: keyof TypeInfoORMAPI;
  path: TypeInfoORMAPIRoutePaths;
  args: any[];
  status: "pending" | "success" | "error";
  response?: any;
  error?: any;
  timestamp: string;
};

type SearchFilter = {
  id: string;
  fieldName: "make" | "model" | "year";
  operator: ComparisonOperators;
  value: string;
};

const ORM_METHOD_PATHS: Record<keyof TypeInfoORMAPI, TypeInfoORMAPIRoutePaths> =
  {
    create: TypeInfoORMAPIRoutePaths.CREATE,
    read: TypeInfoORMAPIRoutePaths.READ,
    update: TypeInfoORMAPIRoutePaths.UPDATE,
    delete: TypeInfoORMAPIRoutePaths.DELETE,
    list: TypeInfoORMAPIRoutePaths.LIST,
    createRelationship: TypeInfoORMAPIRoutePaths.CREATE_RELATIONSHIP,
    deleteRelationship: TypeInfoORMAPIRoutePaths.DELETE_RELATIONSHIP,
    listRelationships: TypeInfoORMAPIRoutePaths.LIST_RELATIONSHIPS,
    listRelatedItems: TypeInfoORMAPIRoutePaths.LIST_RELATED_ITEMS,
  };

const getApiDomain = (hostname: string) => {
  if (hostname === DOMAINS.API) {
    return hostname;
  }

  if (hostname.endsWith(BASE_DOMAIN)) {
    return DOMAINS.API;
  }

  return hostname;
};

const getServiceConfig = () => {
  const { protocol, hostname, port } = window.location;
  const safeProtocol = protocol.replace(":", "");
  const apiDomain = getApiDomain(hostname);
  const apiPort = hostname === apiDomain && port ? Number(port) : undefined;

  return {
    protocol: safeProtocol,
    domain: apiDomain,
    port: apiPort,
    basePath: DEMO_ORM_ROUTE_PATH,
  };
};

const formatCarLabel = (item: any) => {
  const make = item?.make ?? "Unknown";
  const model = item?.model ?? "Model";
  const year = item?.year ?? "Year";

  return `${year} ${make} ${model}`;
};

export const EndToEndDemo: FC = () => {
  const typeInfoMap = DemoTypeInfoMap;
  const personTypeInfo = typeInfoMap.Person;
  const carTypeInfo = typeInfoMap.Car;
  const [requestLog, setRequestLog] = useState<RequestLogEntry[]>([]);
  const [personList, setPersonList] = useState<any[]>([]);
  const [personListCursor, setPersonListCursor] = useState<string | undefined>(
    undefined,
  );
  const [personItemsPerPage, setPersonItemsPerPage] = useState(5);
  const [personCreateKey, setPersonCreateKey] = useState(0);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [selectedPerson, setSelectedPerson] = useState<any | null>(null);
  const [relatedCarId, setRelatedCarId] = useState<string | null>(null);
  const [relatedCar, setRelatedCar] = useState<any | null>(null);
  const [relatedCarSummary, setRelatedCarSummary] = useState<any | null>(null);
  const [carSearchQuery, setCarSearchQuery] = useState("");
  const [carSearchMode, setCarSearchMode] = useState<"lossy" | "exact">(
    "lossy",
  );
  const [carSearchCursor, setCarSearchCursor] = useState<string | undefined>(
    undefined,
  );
  const [carSearchResults, setCarSearchResults] = useState<any[]>([]);
  const [carItemsPerPage, setCarItemsPerPage] = useState(5);
  const [filters, setFilters] = useState<SearchFilter[]>([]);
  const [filtersOperator, setFiltersOperator] = useState<LogicalOperators>(
    LogicalOperators.AND,
  );
  const [carCreateKey, setCarCreateKey] = useState(0);
  const [selectedCarCandidate, setSelectedCarCandidate] = useState<any | null>(
    null,
  );

  const ormClient = useMemo(
    () => new TypeInfoORMClient(getServiceConfig()),
    [],
  );
  const personFormTypeInfo = useMemo(() => {
    if (!personTypeInfo) {
      return personTypeInfo;
    }

    const carField = personTypeInfo.fields?.car;

    if (!carField) {
      return personTypeInfo;
    }

    return {
      ...personTypeInfo,
      fields: {
        ...personTypeInfo.fields,
        car: {
          ...carField,
          optional: true,
        },
      },
    };
  }, [personTypeInfo]);

  const logRequest = useCallback(
    async <T,>(
      methodName: keyof TypeInfoORMAPI,
      args: any[],
      request: () => Promise<T>,
    ): Promise<T> => {
      const id = getSimpleId();
      const entry: RequestLogEntry = {
        id,
        methodName,
        path: ORM_METHOD_PATHS[methodName],
        args,
        status: "pending",
        timestamp: new Date().toISOString(),
      };

      setRequestLog((prev) => [entry, ...prev]);

      try {
        const response = await request();

        setRequestLog((prev) =>
          prev.map((item) =>
            item.id === id
              ? {
                  ...item,
                  status: "success",
                  response,
                }
              : item,
          ),
        );

        return response;
      } catch (error) {
        setRequestLog((prev) =>
          prev.map((item) =>
            item.id === id
              ? {
                  ...item,
                  status: "error",
                  error,
                }
              : item,
          ),
        );
        throw error;
      }
    },
    [],
  );

  const refreshPeople = useCallback(
    async (cursor?: string) => {
      const config: ListItemsConfig = {
        itemsPerPage: personItemsPerPage,
      };

      if (cursor) {
        config.cursor = cursor;
      }

      const results = (await logRequest("list", ["Person", config], () =>
        ormClient.list("Person", config),
      )) as ListItemsResults<any>;

      setPersonList(results.items ?? []);
      setPersonListCursor(results.cursor);
    },
    [logRequest, ormClient, personItemsPerPage],
  );

  const loadRelationship = useCallback(
    async (personId: string) => {
      const config: ListRelationshipsConfig = {
        relationshipItemOrigin: {
          fromTypeName: "Person",
          fromTypeFieldName: "car",
          fromTypePrimaryFieldValue: personId,
        },
        itemsPerPage: 1,
      };

      const results = (await logRequest(
        "listRelatedItems",
        [config, ["id", "make", "model", "year"]],
        () =>
          ormClient.listRelatedItems(config, ["id", "make", "model", "year"]),
      )) as ListItemsResults<any>;

      const [item] = results.items ?? [];

      if (item?.id) {
        setRelatedCarId(String(item.id));
        setRelatedCarSummary(item);
        setRelatedCar(item);
      } else {
        setRelatedCarId(null);
        setRelatedCarSummary(null);
        setRelatedCar(null);
      }
    },
    [logRequest, ormClient],
  );

  const loadPerson = useCallback(
    async (personId: string) => {
      const person = await logRequest("read", ["Person", personId], () =>
        ormClient.read("Person", personId),
      );

      setSelectedPersonId(personId);
      setSelectedPerson(person);
      setSelectedCarCandidate(null);
      await loadRelationship(personId);
    },
    [loadRelationship, logRequest, ormClient],
  );

  const loadCar = useCallback(
    async (carId: string) => {
      const car = await logRequest("read", ["Car", carId], () =>
        ormClient.read("Car", carId),
      );

      setRelatedCar(car);
    },
    [logRequest, ormClient],
  );

  useEffect(() => {
    if (relatedCarId) {
      void loadCar(relatedCarId);
    } else {
      setRelatedCar(null);
    }
  }, [loadCar, relatedCarId]);

  const handleCreatePerson = useCallback(
    async (values: any) => {
      const newId = await logRequest("create", ["Person", values], () =>
        ormClient.create("Person", values),
      );
      const person = await logRequest("read", ["Person", newId], () =>
        ormClient.read("Person", newId),
      );

      setSelectedPersonId(String(newId));
      setSelectedPerson(person);
      setPersonCreateKey((prev) => prev + 1);
      await refreshPeople();
      await loadRelationship(String(newId));
    },
    [logRequest, ormClient, refreshPeople, loadRelationship],
  );

  const handleUpdatePerson = useCallback(
    async (values: any) => {
      if (!selectedPersonId) {
        return;
      }

      const payload = {
        ...values,
        id: selectedPersonId,
      };

      await logRequest("update", ["Person", payload], () =>
        ormClient.update("Person", payload),
      );
      const person = await logRequest(
        "read",
        ["Person", selectedPersonId],
        () => ormClient.read("Person", selectedPersonId),
      );

      setSelectedPerson(person);
    },
    [logRequest, ormClient, selectedPersonId],
  );

  const handleDeletePerson = useCallback(async () => {
    if (!selectedPersonId) {
      return;
    }

    const confirmed = window.confirm(
      "Delete this person and leave their car relationship empty?",
    );

    if (!confirmed) {
      return;
    }

    await logRequest("delete", ["Person", selectedPersonId], () =>
      ormClient.delete("Person", selectedPersonId),
    );

    setSelectedPersonId(null);
    setSelectedPerson(null);
    setRelatedCarId(null);
    setRelatedCar(null);
    setRelatedCarSummary(null);
    await refreshPeople();
  }, [logRequest, ormClient, refreshPeople, selectedPersonId]);

  const handleCreateCar = useCallback(
    async (values: any) => {
      const newId = await logRequest("create", ["Car", values], () =>
        ormClient.create("Car", values),
      );
      const car = await logRequest("read", ["Car", newId], () =>
        ormClient.read("Car", newId),
      );

      setSelectedCarCandidate(car);
      setCarCreateKey((prev) => prev + 1);
      setCarSearchResults((prev) => [car, ...prev]);
    },
    [logRequest, ormClient],
  );

  const handleUpdateCar = useCallback(
    async (values: any) => {
      if (!relatedCarId) {
        return;
      }

      const payload = {
        ...values,
        id: relatedCarId,
      };

      await logRequest("update", ["Car", payload], () =>
        ormClient.update("Car", payload),
      );
      await loadCar(relatedCarId);
    },
    [logRequest, ormClient, relatedCarId, loadCar],
  );

  const handleDeleteCar = useCallback(async () => {
    if (!relatedCarId) {
      return;
    }

    const confirmed = window.confirm(
      "Delete this car? This also removes the relationship.",
    );

    if (!confirmed) {
      return;
    }

    if (selectedPersonId) {
      const relationship: BaseItemRelationshipInfo = {
        fromTypeName: "Person",
        fromTypeFieldName: "car",
        fromTypePrimaryFieldValue: selectedPersonId,
        toTypePrimaryFieldValue: relatedCarId,
      };

      await logRequest("deleteRelationship", [relationship], () =>
        ormClient.deleteRelationship(relationship),
      );
    }

    await logRequest("delete", ["Car", relatedCarId], () =>
      ormClient.delete("Car", relatedCarId),
    );

    setRelatedCarId(null);
    setRelatedCar(null);
    setRelatedCarSummary(null);
  }, [logRequest, ormClient, relatedCarId, selectedPersonId]);

  const buildCarSearchConfig = useCallback(
    (cursor?: string): ListItemsConfig => {
      const config: ListItemsConfig = {
        itemsPerPage: carItemsPerPage,
      };

      if (cursor) {
        config.cursor = cursor;
      }

      const trimmedQuery = carSearchQuery.trim();

      if (trimmedQuery) {
        config.text = {
          query: trimmedQuery,
          mode: carSearchMode,
        };
      } else {
        const activeFilters = filters.filter((filter) => filter.value.trim());

        if (activeFilters.length > 0) {
          config.criteria = {
            logicalOperator: filtersOperator,
            fieldCriteria: activeFilters.map((filter) => ({
              fieldName: filter.fieldName,
              operator: filter.operator,
              value:
                filter.fieldName === "year"
                  ? Number(filter.value)
                  : filter.value,
            })),
          };
        }
      }

      return config;
    },
    [carItemsPerPage, carSearchMode, carSearchQuery, filters, filtersOperator],
  );

  const runCarSearch = useCallback(
    async (cursor?: string) => {
      const config = buildCarSearchConfig(cursor);
      const results = (await logRequest("list", ["Car", config], () =>
        ormClient.list("Car", config),
      )) as ListItemsResults<any>;

      setCarSearchResults(results.items ?? []);
      setCarSearchCursor(results.cursor);
    },
    [buildCarSearchConfig, logRequest, ormClient],
  );

  const handleSetRelationship = useCallback(async () => {
    if (!selectedPersonId || !selectedCarCandidate?.id) {
      return;
    }

    const candidateId = String(selectedCarCandidate.id);

    if (relatedCarId && relatedCarId !== candidateId) {
      const confirmed = window.confirm(
        "Replace the existing car relationship with the selected car?",
      );

      if (!confirmed) {
        return;
      }
    }

    const relationship: BaseItemRelationshipInfo = {
      fromTypeName: "Person",
      fromTypeFieldName: "car",
      fromTypePrimaryFieldValue: selectedPersonId,
      toTypePrimaryFieldValue: candidateId,
    };

    await logRequest("createRelationship", [relationship], () =>
      ormClient.createRelationship(relationship),
    );

    await loadRelationship(selectedPersonId);
    setSelectedCarCandidate(null);
  }, [
    loadRelationship,
    logRequest,
    ormClient,
    relatedCarId,
    selectedCarCandidate,
    selectedPersonId,
  ]);

  const handleRemoveRelationship = useCallback(async () => {
    if (!selectedPersonId || !relatedCarId) {
      return;
    }

    const confirmed = window.confirm("Remove this car relationship?");

    if (!confirmed) {
      return;
    }

    const relationship: BaseItemRelationshipInfo = {
      fromTypeName: "Person",
      fromTypeFieldName: "car",
      fromTypePrimaryFieldValue: selectedPersonId,
      toTypePrimaryFieldValue: relatedCarId,
    };

    await logRequest("deleteRelationship", [relationship], () =>
      ormClient.deleteRelationship(relationship),
    );

    setRelatedCarId(null);
    setRelatedCar(null);
    setRelatedCarSummary(null);
  }, [logRequest, ormClient, relatedCarId, selectedPersonId]);

  const addFilter = () => {
    setFilters((prev) => [
      ...prev,
      {
        id: getSimpleId(),
        fieldName: "make",
        operator: ComparisonOperators.EQUALS,
        value: "",
      },
    ]);
  };

  const updateFilter = (id: string, updates: Partial<SearchFilter>) => {
    setFilters((prev) =>
      prev.map((filter) =>
        filter.id === id ? { ...filter, ...updates } : filter,
      ),
    );
  };

  const removeFilter = (id: string) => {
    setFilters((prev) => prev.filter((filter) => filter.id !== id));
  };

  return (
    <Stack>
      <article>
        <h3>End-to-End ORM Demo</h3>
        <p>
          This flow exercises CRUD, list + cursor pagination, full-text and
          structured search, and first-class relationships using the public ORM
          API.
        </p>
        <p>
          API Target:{" "}
          <strong>
            {getServiceConfig().protocol}://{getServiceConfig().domain}
            {getServiceConfig().port ? `:${getServiceConfig().port}` : ""}
            {DEMO_ORM_ROUTE_PATH}
          </strong>
        </p>
      </article>

      <Section>
        <h4>1. Create a Person</h4>
        <Grid>
          <article>
            <h5>New Person</h5>
            <FormBlock
              key={`person-create-${personCreateKey}`}
              typeInfo={personFormTypeInfo ?? personTypeInfo}
              initialValues={{}}
              operation={TypeOperation.CREATE}
              onSubmit={handleCreatePerson}
              onRelationAction={() => {}}
            />
          </article>
          <article>
            <h5>People List</h5>
            <InlineRow>
              <label>
                Items per page
                <input
                  type="number"
                  min={1}
                  value={personItemsPerPage}
                  onChange={(event) =>
                    setPersonItemsPerPage(Number(event.target.value))
                  }
                />
              </label>
              <button type="button" onClick={() => refreshPeople()}>
                Refresh
              </button>
              <button
                type="button"
                onClick={() => refreshPeople(personListCursor)}
                disabled={!personListCursor}
              >
                Next Page
              </button>
            </InlineRow>
            {personList.length === 0 ? (
              <p>No people loaded yet.</p>
            ) : (
              <List>
                {personList.map((person, index) => (
                  <ListItem key={`${person.id ?? "person"}-${index}`}>
                    <div>
                      <strong>
                        {(person.firstName ?? "First") +
                          " " +
                          (person.lastName ?? "Last")}
                      </strong>
                      <div>ID: {person.id ?? "unknown"}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => loadPerson(String(person.id))}
                    >
                      View
                    </button>
                  </ListItem>
                ))}
              </List>
            )}
            {personListCursor && <small>Cursor: {personListCursor}</small>}
          </article>
        </Grid>
      </Section>

      <Section>
        <h4>2. Person Details & Update</h4>
        {!selectedPersonId ? (
          <article>
            <p>Select a person from the list to load their details.</p>
          </article>
        ) : (
          <Grid>
            <article>
              <h5>Selected Person</h5>
              <FormBlock
                key={`person-edit-${selectedPersonId}`}
                typeInfo={personFormTypeInfo ?? personTypeInfo}
                initialValues={selectedPerson ?? {}}
                operation={TypeOperation.UPDATE}
                onSubmit={handleUpdatePerson}
                onRelationAction={() => {}}
              />
              <button type="button" onClick={handleDeletePerson}>
                Delete Person
              </button>
            </article>
            <article>
              <h5>Person Record (Read)</h5>
              <pre>{JSON.stringify(selectedPerson, null, 2)}</pre>
            </article>
          </Grid>
        )}
      </Section>

      <Section>
        <h4>3. Manage Car Relationship</h4>
        {!selectedPersonId ? (
          <article>
            <p>Select a person to manage their car relationship.</p>
          </article>
        ) : (
          <Stack>
            <article>
              <h5>Current Car Relationship</h5>
              {relatedCarSummary ? (
                <InlineRow>
                  <div>
                    <strong>{formatCarLabel(relatedCarSummary)}</strong>
                    <div>ID: {relatedCarSummary.id}</div>
                  </div>
                  <button type="button" onClick={handleRemoveRelationship}>
                    Remove Relationship
                  </button>
                </InlineRow>
              ) : (
                <p>No car linked yet.</p>
              )}
            </article>

            <Grid>
              <article>
                <h5>Search Cars (Text + Structured + Cursor Paging)</h5>
                <label>
                  Text Query
                  <input
                    type="text"
                    value={carSearchQuery}
                    onChange={(event) => setCarSearchQuery(event.target.value)}
                  />
                </label>
                <label>
                  Text Mode
                  <select
                    value={carSearchMode}
                    onChange={(event) =>
                      setCarSearchMode(event.target.value as "lossy" | "exact")
                    }
                  >
                    <option value="lossy">Lossy</option>
                    <option value="exact">Exact</option>
                  </select>
                </label>
                <InlineRow>
                  <label>
                    Items per page
                    <input
                      type="number"
                      min={1}
                      value={carItemsPerPage}
                      onChange={(event) =>
                        setCarItemsPerPage(Number(event.target.value))
                      }
                    />
                  </label>
                  <button type="button" onClick={() => runCarSearch()}>
                    Run Search
                  </button>
                  <button
                    type="button"
                    onClick={() => runCarSearch(carSearchCursor)}
                    disabled={!carSearchCursor}
                  >
                    Next Page
                  </button>
                </InlineRow>

                <fieldset>
                  <legend>Structured Filters</legend>
                  <InlineRow>
                    <label>
                      Operator
                      <select
                        value={filtersOperator}
                        onChange={(event) =>
                          setFiltersOperator(
                            event.target.value as LogicalOperators,
                          )
                        }
                      >
                        <option value={LogicalOperators.AND}>AND</option>
                        <option value={LogicalOperators.OR}>OR</option>
                      </select>
                    </label>
                    <button type="button" onClick={addFilter}>
                      Add Filter
                    </button>
                  </InlineRow>
                  {filters.length === 0 ? (
                    <p>No structured filters yet.</p>
                  ) : (
                    filters.map((filter) => (
                      <InlineRow key={filter.id}>
                        <select
                          value={filter.fieldName}
                          onChange={(event) =>
                            updateFilter(filter.id, {
                              fieldName: event.target.value as
                                | "make"
                                | "model"
                                | "year",
                            })
                          }
                        >
                          <option value="make">Make</option>
                          <option value="model">Model</option>
                          <option value="year">Year</option>
                        </select>
                        <select
                          value={filter.operator}
                          onChange={(event) =>
                            updateFilter(filter.id, {
                              operator: event.target
                                .value as ComparisonOperators,
                            })
                          }
                        >
                          <option value={ComparisonOperators.EQUALS}>
                            Equals
                          </option>
                          <option value={ComparisonOperators.NOT_EQUALS}>
                            Not Equals
                          </option>
                          <option value={ComparisonOperators.LIKE}>Like</option>
                          <option value={ComparisonOperators.GREATER_THAN}>
                            Greater Than
                          </option>
                          <option value={ComparisonOperators.LESS_THAN}>
                            Less Than
                          </option>
                        </select>
                        <input
                          type="text"
                          value={filter.value}
                          onChange={(event) =>
                            updateFilter(filter.id, {
                              value: event.target.value,
                            })
                          }
                          placeholder="Value"
                        />
                        <button
                          type="button"
                          onClick={() => removeFilter(filter.id)}
                        >
                          Remove
                        </button>
                      </InlineRow>
                    ))
                  )}
                </fieldset>

                {carSearchCursor && <small>Cursor: {carSearchCursor}</small>}
              </article>

              <article>
                <h5>Search Results</h5>
                {carSearchResults.length === 0 ? (
                  <p>No car results yet.</p>
                ) : (
                  <List>
                    {carSearchResults.map((car, index) => (
                      <ListItem key={`${car.id ?? "car"}-${index}`}>
                        <div>
                          <strong>{formatCarLabel(car)}</strong>
                          <div>ID: {car.id ?? "unknown"}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedCarCandidate(car)}
                        >
                          Select
                        </button>
                      </ListItem>
                    ))}
                  </List>
                )}
                <button
                  type="button"
                  onClick={handleSetRelationship}
                  disabled={!selectedCarCandidate}
                >
                  Set Relationship to Selected Car
                </button>
                {selectedCarCandidate && (
                  <small>
                    Selected: {formatCarLabel(selectedCarCandidate)} (
                    {selectedCarCandidate.id})
                  </small>
                )}
              </article>
            </Grid>

            <Grid>
              <article>
                <h5>Create a New Car</h5>
                <FormBlock
                  key={`car-create-${carCreateKey}`}
                  typeInfo={carTypeInfo}
                  initialValues={{}}
                  operation={TypeOperation.CREATE}
                  onSubmit={handleCreateCar}
                />
              </article>
              <article>
                <h5>Related Car Details & Update</h5>
                {!relatedCarId ? (
                  <p>No related car to edit yet.</p>
                ) : (
                  <>
                    <FormBlock
                      key={`car-edit-${relatedCarId}`}
                      typeInfo={carTypeInfo}
                      initialValues={relatedCar ?? {}}
                      operation={TypeOperation.UPDATE}
                      onSubmit={handleUpdateCar}
                    />
                    <button type="button" onClick={handleDeleteCar}>
                      Delete Related Car
                    </button>
                  </>
                )}
              </article>
            </Grid>
          </Stack>
        )}
      </Section>

      <Section>
        <h4>Request / Response Log</h4>
        <article>
          <InlineRow>
            <p>
              Inspect the exact payloads sent to the ORM routes and the
              responses returned.
            </p>
            <button type="button" onClick={() => setRequestLog([])}>
              Clear Log
            </button>
          </InlineRow>
          {requestLog.length === 0 ? (
            <p>No requests yet.</p>
          ) : (
            <Stack>
              {requestLog.map((entry) => (
                <details key={entry.id}>
                  <summary>
                    {entry.methodName} ({entry.path}) - {entry.status}
                  </summary>
                  <LogGrid>
                    <div>
                      <strong>Request</strong>
                      <pre>
                        {JSON.stringify(
                          {
                            args: entry.args,
                            timestamp: entry.timestamp,
                          },
                          null,
                          2,
                        )}
                      </pre>
                    </div>
                    <div>
                      <strong>Response</strong>
                      <pre>{JSON.stringify(entry.response, null, 2)}</pre>
                    </div>
                    <div>
                      <strong>Error</strong>
                      <pre>{JSON.stringify(entry.error, null, 2)}</pre>
                    </div>
                  </LogGrid>
                </details>
              ))}
            </Stack>
          )}
        </article>
      </Section>
    </Stack>
  );
};

type FormBlockProps = {
  typeInfo: TypeInfo;
  initialValues: Record<string, any>;
  operation: TypeOperation;
  onSubmit: (values: any) => void;
  onRelationAction?: (payload: RelationActionPayload) => void;
};

const FormBlock: FC<FormBlockProps> = ({
  typeInfo,
  initialValues,
  operation,
  onSubmit,
  onRelationAction,
}) => {
  const controller = useFormEngine(initialValues, typeInfo, { operation });

  return (
    <AutoFormView
      controller={controller}
      onSubmit={onSubmit}
      onRelationAction={onRelationAction}
    />
  );
};

const Stack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2rem;
`;

const Section = styled.section`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
  align-items: start;
`;

const InlineRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: center;
`;

const List = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const ListItem = styled.li`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem;
`;

const LogGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1rem;
`;
