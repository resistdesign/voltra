import type { FC } from "react";
import { Grid, InlineRow, List, ListItem, Section } from "../layout";

type PeopleHomeScreenProps = {
  personList: any[];
  personItemsPerPage: number;
  personListCursor?: string;
  onItemsPerPageChange: (value: number) => void;
  onRefresh: () => void;
  onNextPage: () => void;
  onSelectPerson: (personId: string) => void;
  onStartCreate: () => void;
};

export const PeopleHomeScreen: FC<PeopleHomeScreenProps> = ({
  personList,
  personItemsPerPage,
  personListCursor,
  onItemsPerPageChange,
  onRefresh,
  onNextPage,
  onSelectPerson,
  onStartCreate,
}) => (
  <Section>
    <h4>People</h4>
    <Grid>
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
                onItemsPerPageChange(Number(event.target.value))
              }
            />
          </label>
          <button type="button" onClick={onRefresh}>
            Refresh
          </button>
          <button
            type="button"
            onClick={onNextPage}
            disabled={!personListCursor}
          >
            Next Page
          </button>
          <button type="button" onClick={onStartCreate}>
            Create Person
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
                  onClick={() => onSelectPerson(String(person.id))}
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
);
