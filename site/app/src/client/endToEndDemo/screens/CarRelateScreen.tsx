import type { FC } from "react";
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
}) => (
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
            <button type="button" onClick={onRemoveRelationship}>
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
          {carSearchMode === "lossy" ? (
            <label>
              Text Query
              <input
                type="text"
                value={carSearchQuery}
                onChange={(event) => onCarSearchQueryChange(event.target.value)}
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
                    onChange={(event) =>
                      onFiltersOperatorChange(event.target.value as LogicalOperators)
                    }
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
                      value={filter.fieldName}
                      onChange={(event) =>
                        onUpdateFilter(filter.id, {
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
                        onUpdateFilter(filter.id, {
                          operator: event.target.value as ComparisonOperators,
                        })
                      }
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
                      value={filter.value}
                      onChange={(event) =>
                        onUpdateFilter(filter.id, {
                          value: event.target.value,
                        })
                      }
                      placeholder="Value"
                    />
                    <button type="button" onClick={() => onRemoveFilter(filter.id)}>
                      Remove
                    </button>
                  </InlineRow>
                ))
              )}
            </fieldset>
          )}
          <label>
            Text Mode
            <select
              value={carSearchMode}
              onChange={(event) =>
                onCarSearchModeChange(event.target.value as "lossy" | "exact")
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
                  onCarItemsPerPageChange(
                    toPositiveInt(event.target.value, carItemsPerPage),
                  )
                }
              />
            </label>
            <button type="button" onClick={() => onRunSearch()}>
              Run Search
            </button>
            <button
              type="button"
              onClick={() => onRunSearch(carSearchCursor)}
              disabled={!carSearchCursor}
            >
              Next Page
            </button>
          </InlineRow>
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
                  <button type="button" onClick={() => onSelectCarCandidate(car)}>
                    Select
                  </button>
                </ListItem>
              ))}
            </List>
          )}
          <button
            type="button"
            onClick={onSetRelationship}
            disabled={!selectedCarCandidate}
          >
            Set Relationship to Selected Car
          </button>
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
                onSubmit={onUpdateCar}
              />
              <button type="button" onClick={onDeleteCar}>
                Delete Related Car
              </button>
            </>
          )}
        </article>
      </Grid>
    </Stack>
  </Section>
);
