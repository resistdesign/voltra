import { FC, useCallback, useEffect, useMemo, useReducer, useState } from "react";
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
import {
  BASE_DOMAIN,
  DEMO_ORM_ROUTE_PATH,
  DOMAINS,
} from "../../../common/Constants";
import { DemoTypeInfoMap } from "../../../common/DemoTypeInfoMap";
import { BaseItemRelationshipInfo } from "../../../../src/common/ItemRelationshipInfoTypes";
import { DebugLogPanel, type RequestLogEntry } from "./endToEndDemo/components/DebugLogPanel";
import { CarRelateScreen } from "./endToEndDemo/screens/CarRelateScreen";
import { CreatePersonScreen } from "./endToEndDemo/screens/CreatePersonScreen";
import { PeopleHomeScreen } from "./endToEndDemo/screens/PeopleHomeScreen";
import { PersonDetailScreen } from "./endToEndDemo/screens/PersonDetailScreen";
import { Stack } from "./endToEndDemo/layout";
import {
  demoAppReducer,
  demoInitialState,
  getActiveScreen,
} from "./endToEndDemo/demoState";

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

export const EndToEndDemo: FC = () => {
  const typeInfoMap = DemoTypeInfoMap;
  const personTypeInfo = typeInfoMap.Person;
  const carTypeInfo = typeInfoMap.Car;
  const [demoState, dispatch] = useReducer(
    demoAppReducer,
    demoInitialState,
  );
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
      dispatch({ type: "enterPersonDetail", personId: String(newId) });
    },
    [logRequest, ormClient, refreshPeople, loadRelationship, dispatch],
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
    dispatch({ type: "goToPeopleList" });
    await refreshPeople();
  }, [logRequest, ormClient, refreshPeople, selectedPersonId, dispatch]);

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
    dispatch({ type: "exitRelateBackToPerson" });
  }, [
    loadRelationship,
    logRequest,
    ormClient,
    relatedCarId,
    selectedCarCandidate,
    selectedPersonId,
    dispatch,
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

  const screen = getActiveScreen(demoState);

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


      {screen === "PeopleHome" && (
        <PeopleHomeScreen
          personList={personList}
          personItemsPerPage={personItemsPerPage}
          personListCursor={personListCursor}
          onItemsPerPageChange={setPersonItemsPerPage}
          onRefresh={() => refreshPeople()}
          onNextPage={() => refreshPeople(personListCursor)}
          onSelectPerson={async (personId) => {
            await loadPerson(personId);
            dispatch({ type: "enterPersonDetail", personId });
          }}
          onStartCreate={() => dispatch({ type: "startCreatePerson" })}
        />
      )}

      {screen === "CreatePerson" && (
        <CreatePersonScreen
          personTypeInfo={personFormTypeInfo ?? personTypeInfo}
          personCreateKey={personCreateKey}
          onCreate={handleCreatePerson}
          onBack={() => dispatch({ type: "goToPeopleList" })}
        />
      )}

      {screen === "PersonDetail" && selectedPersonId && (
        <PersonDetailScreen
          personTypeInfo={personFormTypeInfo ?? personTypeInfo}
          personId={selectedPersonId}
          person={selectedPerson}
          onUpdate={handleUpdatePerson}
          onDelete={handleDeletePerson}
          onStartRelate={() =>
            dispatch({ type: "startRelateCar", personId: selectedPersonId })
          }
          onBack={() => dispatch({ type: "goToPeopleList" })}
          onRelationAction={() =>
            dispatch({ type: "startRelateCar", personId: selectedPersonId })
          }
        />
      )}

      {screen === "CarRelate" && (
        <CarRelateScreen
          relatedCarSummary={relatedCarSummary}
          relatedCarId={relatedCarId}
          relatedCar={relatedCar}
          selectedCarCandidate={selectedCarCandidate}
          carTypeInfo={carTypeInfo}
          carCreateKey={carCreateKey}
          carSearchMode={carSearchMode}
          carSearchQuery={carSearchQuery}
          carSearchCursor={carSearchCursor}
          carSearchResults={carSearchResults}
          carItemsPerPage={carItemsPerPage}
          filters={filters}
          filtersOperator={filtersOperator}
          onRemoveRelationship={handleRemoveRelationship}
          onSetRelationship={handleSetRelationship}
          onSelectCarCandidate={setSelectedCarCandidate}
          onCreateCar={handleCreateCar}
          onUpdateCar={handleUpdateCar}
          onDeleteCar={handleDeleteCar}
          onCarSearchQueryChange={setCarSearchQuery}
          onCarSearchModeChange={setCarSearchMode}
          onFiltersOperatorChange={setFiltersOperator}
          onAddFilter={addFilter}
          onUpdateFilter={updateFilter}
          onRemoveFilter={removeFilter}
          onCarItemsPerPageChange={setCarItemsPerPage}
          onRunSearch={runCarSearch}
          onBack={() => dispatch({ type: "exitRelateBackToPerson" })}
        />
      )}

      <DebugLogPanel requestLog={requestLog} onClear={() => setRequestLog([])} />

    </Stack>
  );
};
