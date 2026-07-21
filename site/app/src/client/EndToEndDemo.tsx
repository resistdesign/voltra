import { FC, useCallback, useEffect, useMemo, useReducer, useState } from "react";
import { TypeInfoORMClient } from "../../../../src/app/utils";
import { getSimpleId } from "../../../../src/common/IdGeneration";
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
import { DebugLogPanel } from "./EndToEndDemo/components/DebugLogPanel";
import { ContextBar } from "./EndToEndDemo/components/ContextBar";
import { CarRelateScreen } from "./EndToEndDemo/screens/CarRelateScreen";
import { CreatePersonScreen } from "./EndToEndDemo/screens/CreatePersonScreen";
import { PeopleHomeScreen } from "./EndToEndDemo/screens/PeopleHomeScreen";
import { PersonDetailScreen } from "./EndToEndDemo/screens/PersonDetailScreen";
import { Stack } from "./EndToEndDemo/layout";
import {
  demoAppReducer,
  demoInitialState,
  getActiveScreen,
} from "./EndToEndDemo/demoState";
import { formatPersonLabel } from "./EndToEndDemo/utils";
import { useDemoLogger } from "./EndToEndDemo/logging/demoLogger";
import { usePeople } from "./EndToEndDemo/hooks/usePeople";
import { useCars } from "./EndToEndDemo/hooks/useCars";
import { useRelationship } from "./EndToEndDemo/hooks/useRelationship";

type SearchFilter = {
  id: string;
  fieldName: "make" | "model" | "year";
  operator: ComparisonOperators;
  value: string;
};

type CarSearchField = "make" | "model";

const getFilterValues = (filter: SearchFilter) =>
  (filter.operator === ComparisonOperators.IN
    ? filter.value.split(",")
    : [filter.value]
  )
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => (filter.fieldName === "year" ? Number(value) : value));

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
  const { requestLog, logRequest, clearLog } = useDemoLogger();
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
  const [carSearchField, setCarSearchField] = useState<CarSearchField>(
    "model",
  );
  const [carSearchOperator, setCarSearchOperator] =
    useState<ComparisonOperators>(
      ComparisonOperators.LIKE,
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
  const [pending, setPending] = useState<Record<string, boolean>>({});

  const ormClient = useMemo(
    () => new TypeInfoORMClient(getServiceConfig()),
    [],
  );
  const { listPeople, readPerson, createPerson, updatePerson, deletePerson } =
    usePeople({ ormClient, logRequest });
  const { listCars, readCar, createCar, updateCar, deleteCar } = useCars({
    ormClient,
    logRequest,
  });
  const { listRelatedItems, createRelationship, deleteRelationship } =
    useRelationship({ ormClient, logRequest });
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

  const withPending = useCallback(
    async <T,>(key: string, task: () => Promise<T>): Promise<T> => {
      setPending((prev) => ({ ...prev, [key]: true }));

      try {
        return await task();
      } finally {
        setPending((prev) => ({ ...prev, [key]: false }));
      }
    },
    [],
  );

  const refreshPeople = useCallback(
    async (cursor?: string) => {
      await withPending("peopleLoading", async () => {
        const config: ListItemsConfig = {
          itemsPerPage: personItemsPerPage,
        };

        if (cursor) {
          config.cursor = cursor;
        }

        const results = (await listPeople(config)) as ListItemsResults<any>;

        setPersonList(results.items ?? []);
        setPersonListCursor(results.cursor);
      });
    },
    [listPeople, personItemsPerPage, withPending],
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

      const results = (await listRelatedItems(config, [
        "id",
        "make",
        "model",
        "year",
      ])) as ListItemsResults<any>;

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
    [listRelatedItems],
  );

  const loadPerson = useCallback(
    async (personId: string) => {
      const person = await readPerson(personId);

      setSelectedPersonId(personId);
      setSelectedPerson(person);
      setSelectedCarCandidate(null);
      await loadRelationship(personId);
    },
    [loadRelationship, readPerson],
  );

  const loadCar = useCallback(
    async (carId: string) => {
      const car = await readCar(carId);

      setRelatedCar(car);
    },
    [readCar],
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
      await withPending("personCreating", async () => {
        const newId = await createPerson(values);
        const person = await readPerson(String(newId));

        setSelectedPersonId(String(newId));
        setSelectedPerson(person);
        setPersonCreateKey((prev) => prev + 1);
        await refreshPeople();
        await loadRelationship(String(newId));
        dispatch({ type: "enterPersonDetail", personId: String(newId) });
      });
    },
    [
      createPerson,
      readPerson,
      refreshPeople,
      loadRelationship,
      dispatch,
      withPending,
    ],
  );

  const handleUpdatePerson = useCallback(
    async (values: any) => {
      if (!selectedPersonId) {
        return;
      }

      await withPending("personUpdating", async () => {
        const payload = {
          ...values,
          id: selectedPersonId,
        };

        await updatePerson(payload);
        const person = await readPerson(selectedPersonId);

        setSelectedPerson(person);
      });
    },
    [updatePerson, readPerson, selectedPersonId, withPending],
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

    await withPending("personDeleting", async () => {
      await deletePerson(selectedPersonId);

      setSelectedPersonId(null);
      setSelectedPerson(null);
      setRelatedCarId(null);
      setRelatedCar(null);
      setRelatedCarSummary(null);
      dispatch({ type: "goToPeopleList" });
      await refreshPeople();
    });
  }, [deletePerson, refreshPeople, selectedPersonId, dispatch, withPending]);

  const handleCreateCar = useCallback(
    async (values: any) => {
      await withPending("carCreating", async () => {
        const newId = await createCar(values);
        const car = await readCar(String(newId));

        setSelectedCarCandidate(car);
        setCarCreateKey((prev) => prev + 1);
        setCarSearchResults((prev) => [car, ...prev]);
      });
    },
    [createCar, readCar, withPending],
  );

  const handleUpdateCar = useCallback(
    async (values: any) => {
      if (!relatedCarId) {
        return;
      }

      await withPending("carUpdating", async () => {
        const payload = {
          ...values,
          id: relatedCarId,
        };

        await updateCar(payload);
        await loadCar(relatedCarId);
      });
    },
    [updateCar, relatedCarId, loadCar, withPending],
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

    await withPending("carDeleting", async () => {
      if (selectedPersonId) {
        const relationship: BaseItemRelationshipInfo = {
          fromTypeName: "Person",
          fromTypeFieldName: "car",
          fromTypePrimaryFieldValue: selectedPersonId,
          toTypePrimaryFieldValue: relatedCarId,
        };

        await deleteRelationship(relationship);
      }

      await deleteCar(relatedCarId);

      setRelatedCarId(null);
      setRelatedCar(null);
      setRelatedCarSummary(null);
    });
  }, [deleteRelationship, deleteCar, relatedCarId, selectedPersonId, withPending]);

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
        config.criteria = {
          logicalOperator: LogicalOperators.AND,
          fieldCriteria: [
            {
              fieldName: carSearchField,
              operator: carSearchOperator,
              value: trimmedQuery,
            },
          ],
        };
      } else {
        const activeFilters = filters.filter((filter) => {
          const values = getFilterValues(filter);

          if (values.length === 0) {
            return false;
          }

          if (filter.fieldName === "year") {
            return values.every(Number.isFinite);
          }

          return true;
        });

        if (activeFilters.length > 0) {
          config.criteria = {
            logicalOperator: filtersOperator,
            fieldCriteria: activeFilters.map((filter) => {
              const values = getFilterValues(filter);

              if (filter.operator === ComparisonOperators.IN) {
                return {
                  fieldName: filter.fieldName,
                  operator: filter.operator,
                  valueOptions: values,
                };
              }

              return {
                fieldName: filter.fieldName,
                operator: filter.operator,
                value: values[0],
              };
            }),
          };
        }
      }

      return config;
    },
    [
      carItemsPerPage,
      carSearchField,
      carSearchOperator,
      carSearchQuery,
      filters,
      filtersOperator,
    ],
  );

  const runCarSearch = useCallback(
    async (cursor?: string) => {
      await withPending("carSearching", async () => {
        const config = buildCarSearchConfig(cursor);
        const results = (await listCars(config)) as ListItemsResults<any>;

        setCarSearchResults(results.items ?? []);
        setCarSearchCursor(results.cursor);
      });
    },
    [buildCarSearchConfig, listCars, withPending],
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

    await withPending("relationshipSaving", async () => {
      await createRelationship(relationship);

      await loadRelationship(selectedPersonId);
      const person = await readPerson(selectedPersonId);
      setSelectedPerson(person);
      setSelectedCarCandidate(null);
      dispatch({ type: "exitRelateBackToPerson" });
    });
  }, [
    loadRelationship,
    createRelationship,
    readPerson,
    relatedCarId,
    selectedCarCandidate,
    selectedPersonId,
    dispatch,
    withPending,
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

    await withPending("relationshipRemoving", async () => {
      await deleteRelationship(relationship);

      setRelatedCarId(null);
      setRelatedCar(null);
      setRelatedCarSummary(null);
    });
  }, [deleteRelationship, relatedCarId, selectedPersonId, withPending]);

  const addFilter = useCallback(() => {
    setFilters((prev) => [
      ...prev,
      {
        id: getSimpleId(),
        fieldName: "make",
        operator: ComparisonOperators.EQUALS,
        value: "",
      },
    ]);
  }, []);

  const updateFilter = useCallback((id: string, updates: Partial<SearchFilter>) => {
    setFilters((prev) =>
      prev.map((filter) =>
        filter.id === id ? { ...filter, ...updates } : filter,
      ),
    );
  }, []);

  const removeFilter = useCallback((id: string) => {
    setFilters((prev) => prev.filter((filter) => filter.id !== id));
  }, []);

  const handleGoToPeople = useCallback(
    () => dispatch({ type: "goToPeopleList" }),
    [dispatch],
  );

  const handleExitRelate = useCallback(
    () => dispatch({ type: "exitRelateBackToPerson" }),
    [dispatch],
  );

  const handleRefreshPeople = useCallback(() => {
    void refreshPeople();
  }, [refreshPeople]);

  const handleNextPeoplePage = useCallback(() => {
    void refreshPeople(personListCursor);
  }, [personListCursor, refreshPeople]);

  const handleSelectPerson = useCallback(
    async (personId: string) => {
      await loadPerson(personId);
      dispatch({ type: "enterPersonDetail", personId });
    },
    [dispatch, loadPerson],
  );

  const handleStartCreatePerson = useCallback(
    () => dispatch({ type: "startCreatePerson" }),
    [dispatch],
  );

  const handleStartRelate = useCallback(() => {
    if (!selectedPersonId) {
      return;
    }

    dispatch({ type: "startRelateCar", personId: selectedPersonId });
  }, [dispatch, selectedPersonId]);

  const screen = getActiveScreen(demoState);
  const personLabel = formatPersonLabel(selectedPerson, selectedPersonId);
  const showPerson = Boolean(selectedPersonId);
  const isRelating = demoState.mode === "relate";
  const isPeopleLoading = !!pending.peopleLoading;
  const isPersonCreating = !!pending.personCreating;
  const isPersonUpdating = !!pending.personUpdating;
  const isPersonDeleting = !!pending.personDeleting;
  const isCarSearching = !!pending.carSearching;
  const isCarCreating = !!pending.carCreating;
  const isCarUpdating = !!pending.carUpdating;
  const isCarDeleting = !!pending.carDeleting;
  const isRelationshipSaving = !!pending.relationshipSaving;
  const isRelationshipRemoving = !!pending.relationshipRemoving;

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

      <ContextBar
        personLabel={personLabel}
        showPerson={showPerson}
        isRelating={isRelating}
        onGoToPeople={handleGoToPeople}
        onExitRelate={handleExitRelate}
      />

      {screen === "PeopleHome" && (
        <PeopleHomeScreen
          personList={personList}
          personItemsPerPage={personItemsPerPage}
          personListCursor={personListCursor}
          isLoading={isPeopleLoading}
          onItemsPerPageChange={setPersonItemsPerPage}
          onRefresh={handleRefreshPeople}
          onNextPage={handleNextPeoplePage}
          onSelectPerson={handleSelectPerson}
          onStartCreate={handleStartCreatePerson}
        />
      )}

      {screen === "CreatePerson" && (
        <CreatePersonScreen
          personTypeInfo={personFormTypeInfo ?? personTypeInfo}
          personCreateKey={personCreateKey}
          isSaving={isPersonCreating}
          onCreate={handleCreatePerson}
          onBack={handleGoToPeople}
        />
      )}

      {screen === "PersonDetail" && selectedPersonId && (
        <PersonDetailScreen
          personTypeInfo={personFormTypeInfo ?? personTypeInfo}
          personId={selectedPersonId}
          person={selectedPerson}
          isSaving={isPersonUpdating}
          isDeleting={isPersonDeleting}
          onUpdate={handleUpdatePerson}
          onDelete={handleDeletePerson}
          onStartRelate={handleStartRelate}
          onBack={handleGoToPeople}
          onRelationAction={handleStartRelate}
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
          isSearching={isCarSearching}
          isRelating={isRelationshipSaving}
          isRemovingRelationship={isRelationshipRemoving}
          isCarCreating={isCarCreating}
          isCarUpdating={isCarUpdating}
          isCarDeleting={isCarDeleting}
          carSearchField={carSearchField}
          carSearchOperator={carSearchOperator}
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
          onCarSearchFieldChange={setCarSearchField}
          onCarSearchOperatorChange={setCarSearchOperator}
          onFiltersOperatorChange={setFiltersOperator}
          onAddFilter={addFilter}
          onUpdateFilter={updateFilter}
          onRemoveFilter={removeFilter}
          onCarItemsPerPageChange={setCarItemsPerPage}
          onRunSearch={runCarSearch}
          onBack={handleExitRelate}
        />
      )}

      <DebugLogPanel requestLog={requestLog} onClear={clearLog} />

    </Stack>
  );
};
