import {
  type ChangeEvent,
  type FC,
  type MouseEvent,
  useCallback,
} from "react";
import { ComparisonOperators, LogicalOperators } from "../../../../../../src/common/SearchTypes";
import type { TypeInfo } from "../../../../../../src/common/TypeParsing/TypeInfo";
import { TypeOperation } from "../../../../../../src/common/TypeParsing/TypeInfo";
import { FormBlock } from "../components/FormBlock";
import { Grid, InlineRow, List, ListItem, Section, Stack } from "../layout";
import { formatCarLabel, toPositiveInt } from "../utils";

type SearchFilter = {
  id: string;
  fieldName: "make" | "model" | "year";
  operator: ComparisonOperators;
  value: string;
};

type CarRelateScreenProps = {
  relatedCarSummary: any | null;
  relatedCarId: string | null;
  relatedCar: any | null;
  selectedCarCandidate: any | null;
  carTypeInfo: TypeInfo;
  carCreateKey: number;
  isSearching?: boolean;
  isRelating?: boolean;
  isRemovingRelationship?: boolean;
  isCarCreating?: boolean;
  isCarUpdating?: boolean;
  isCarDeleting?: boolean;
  carSearchMode: "lossy" | "exact";
  carSearchQuery: string;
  carSearchCursor?: string;
  carSearchResults: any[];
  carItemsPerPage: number;
  filters: SearchFilter[];
  filtersOperator: LogicalOperators;
  onRemoveRelationship: () => void;
  onSetRelationship: () => void;
  onSelectCarCandidate: (car: any) => void;
  onCreateCar: (values: any) => void;
  onUpdateCar: (values: any) => void;
  onDeleteCar: () => void;
  onCarSearchQueryChange: (value: string) => void;
  onCarSearchModeChange: (value: "lossy" | "exact") => void;
  onFiltersOperatorChange: (value: LogicalOperators) => void;
  onAddFilter: () => void;
  onUpdateFilter: (id: string, updates: Partial<SearchFilter>) => void;
  onRemoveFilter: (id: string) => void;
  onCarItemsPerPageChange: (value: number) => void;
  onRunSearch: (cursor?: string) => void;
  onBack: () => void;
};

export const CarRelateScreen: FC<CarRelateScreenProps> = ({
  relatedCarSummary,
  relatedCarId,
  relatedCar,
  selectedCarCandidate,
  carTypeInfo,
  carCreateKey,
  isSearching,
  isRelating,
  isRemovingRelationship,
  isCarCreating,
  isCarUpdating,
  isCarDeleting,
  carSearchMode,
  carSearchQuery,
  carSearchCursor,
  carSearchResults,
  carItemsPerPage,
  filters,
  filtersOperator,
  onRemoveRelationship,
  onSetRelationship,
  onSelectCarCandidate,
  onCreateCar,
  onUpdateCar,
  onDeleteCar,
  onCarSearchQueryChange,
  onCarSearchModeChange,
  onFiltersOperatorChange,
  onAddFilter,
  onUpdateFilter,
  onRemoveFilter,
  onCarItemsPerPageChange,
  onRunSearch,
  onBack,
}) => {
  const handleCarSearchQueryChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      onCarSearchQueryChange(event.target.value);
    },
    [onCarSearchQueryChange],
  );

  const handleFiltersOperatorChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      onFiltersOperatorChange(event.target.value as LogicalOperators);
    },
    [onFiltersOperatorChange],
  );

  const handleFilterFieldChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      const filterId = event.currentTarget.getAttribute("data-filter-id");
      if (!filterId) {
        return;
      }
      onUpdateFilter(filterId, {
        fieldName: event.target.value as "make" | "model" | "year",
      });
    },
    [onUpdateFilter],
  );

  const handleFilterOperatorChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      const filterId = event.currentTarget.getAttribute("data-filter-id");
      if (!filterId) {
        return;
      }
      onUpdateFilter(filterId, {
        operator: event.target.value as ComparisonOperators,
      });
    },
    [onUpdateFilter],
  );

  const handleFilterValueChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const filterId = event.currentTarget.getAttribute("data-filter-id");
      if (!filterId) {
        return;
      }
      onUpdateFilter(filterId, {
        value: event.target.value,
      });
    },
    [onUpdateFilter],
  );

  const handleRemoveFilter = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      const filterId = event.currentTarget.getAttribute("data-filter-id");
      if (filterId) {
        onRemoveFilter(filterId);
      }
    },
    [onRemoveFilter],
  );

  const handleCarSearchModeChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      onCarSearchModeChange(event.target.value as "lossy" | "exact");
    },
    [onCarSearchModeChange],
  );

  const handleCarItemsPerPageChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      onCarItemsPerPageChange(
        toPositiveInt(event.target.value, carItemsPerPage),
      );
    },
    [carItemsPerPage, onCarItemsPerPageChange],
  );

  const handleRunSearch = useCallback(() => {
    onRunSearch();
  }, [onRunSearch]);

  const handleRunSearchNextPage = useCallback(() => {
    onRunSearch(carSearchCursor);
  }, [carSearchCursor, onRunSearch]);

  const handleSelectCarCandidate = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      const indexRaw = event.currentTarget.getAttribute("data-car-index");
      if (!indexRaw) {
        return;
      }
      const index = Number(indexRaw);
      if (!Number.isFinite(index)) {
        return;
      }
      const candidate = carSearchResults[index];
      if (candidate !== undefined) {
        onSelectCarCandidate(candidate);
      }
    },
    [carSearchResults, onSelectCarCandidate],
  );

  return (
    <Section>
      <InlineRow>
        <h4>Manage Car Relationship</h4>
        <button type="button" onClick={onBack}>
          Back to Person
        </button>
      </InlineRow>
      <Stack>
        <article>
          <h5>Current Car Relationship</h5>
          {relatedCarSummary ? (
            <InlineRow>
              <div>
                <strong>{formatCarLabel(relatedCarSummary)}</strong>
                <div>ID: {relatedCarSummary.id}</div>
              </div>
              <button
                type="button"
                onClick={onRemoveRelationship}
                disabled={isRemovingRelationship}
              >
                Remove Relationship
              </button>
              {isRemovingRelationship && <small>Removing...</small>}
            </InlineRow>
          ) : (
            <p>No car linked yet.</p>
          )}
        </article>

        <Grid>
          <article>
            <h5>Search Cars (Text + Structured + Cursor Paging)</h5>
            {carSearchMode === "lossy" ? (
              <label>
                Text Query
                <input
                  type="text"
                  value={carSearchQuery}
                  onChange={handleCarSearchQueryChange}
                />
              </label>
            ) : (
              <fieldset>
                <legend>Structured Filters</legend>
                <InlineRow>
                  <label>
                    Operator
                    <select
                      value={filtersOperator}
                      onChange={handleFiltersOperatorChange}
                    >
                      <option value={LogicalOperators.AND}>AND</option>
                      <option value={LogicalOperators.OR}>OR</option>
                    </select>
                  </label>
                  <button type="button" onClick={onAddFilter}>
                    Add Filter
                  </button>
                </InlineRow>
                {filters.length === 0 ? (
                  <p>No structured filters yet.</p>
                ) : (
                  filters.map((filter) => (
                    <InlineRow key={filter.id}>
                      <select
                        data-filter-id={filter.id}
                        value={filter.fieldName}
                        onChange={handleFilterFieldChange}
                      >
                        <option value="make">Make</option>
                        <option value="model">Model</option>
                        <option value="year">Year</option>
                      </select>
                      <select
                        data-filter-id={filter.id}
                        value={filter.operator}
                        onChange={handleFilterOperatorChange}
                      >
                        <option value={ComparisonOperators.EQUALS}>Equals</option>
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
                        data-filter-id={filter.id}
                        value={filter.value}
                        onChange={handleFilterValueChange}
                        placeholder="Value"
                      />
                      <button
                        type="button"
                        data-filter-id={filter.id}
                        onClick={handleRemoveFilter}
                      >
                        Remove
                      </button>
                    </InlineRow>
                  ))
                )}
              </fieldset>
            )}
            <label>
              Text Mode
              <select value={carSearchMode} onChange={handleCarSearchModeChange}>
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
                  onChange={handleCarItemsPerPageChange}
                />
              </label>
              <button type="button" onClick={handleRunSearch} disabled={isSearching}>
                Run Search
              </button>
              <button
                type="button"
                onClick={handleRunSearchNextPage}
                disabled={!carSearchCursor || isSearching}
              >
                Next Page
              </button>
            </InlineRow>
            {isSearching && <small>Loading...</small>}
            {carSearchCursor && <small>Cursor: {carSearchCursor}</small>}
          </article>

          <article>
            <h5>Search Results</h5>
            {carSearchResults.length === 0 ? (
              <p>Search cars or create one, then attach.</p>
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
                      data-car-index={String(index)}
                      onClick={handleSelectCarCandidate}
                    >
                      Select
                    </button>
                  </ListItem>
                ))}
              </List>
            )}
            <button
              type="button"
              onClick={onSetRelationship}
              disabled={!selectedCarCandidate || isRelating}
            >
              Set Relationship to Selected Car
            </button>
            {isRelating && <small>Saving...</small>}
            {selectedCarCandidate && (
              <small>
                Selected: {formatCarLabel(selectedCarCandidate)} ({selectedCarCandidate.id})
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
              onSubmit={onCreateCar}
              submitDisabled={isCarCreating}
            />
            {isCarCreating && <small>Saving...</small>}
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
                  onSubmit={onUpdateCar}
                  submitDisabled={isCarUpdating}
                />
                <button
                  type="button"
                  onClick={onDeleteCar}
                  disabled={isCarDeleting}
                >
                  Delete Related Car
                </button>
                {isCarUpdating && <small>Saving...</small>}
                {isCarDeleting && <small>Deleting...</small>}
              </>
            )}
          </article>
        </Grid>
      </Stack>
    </Section>
  );
};
