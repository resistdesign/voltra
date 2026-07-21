# EndToEndDemo map

Entrypoints
- Route wiring: `site/app/src/client/App.tsx` ("/end-to-end-demo")
- Demo component: `site/app/src/client/EndToEndDemo.tsx`

Screens (single active screen at a time)
- PeopleHomeScreen
  - People list (cursor paging + items per page)
  - Primary CTA: Create Person
- CreatePersonScreen
  - New Person form
- PersonDetailScreen
  - Selected person update/delete form
  - Read-only JSON view
  - Entry point to Manage Car Relationship
- CarRelateScreen
  - Current relationship summary + remove
  - Car search (text/structured, paging) + results + select
  - Create new car form
  - Related car update/delete form
- DebugLogPanel (persistent)
  - Log list with request/response payloads + clear

State sources in `EndToEndDemo.tsx`
- App state (reducer): `demoState` from `EndToEndDemo/demoState.ts`
- Selection: `selectedPersonId`, `selectedPerson`, `selectedCarCandidate`
- Relationship: `relatedCarId`, `relatedCar`, `relatedCarSummary`
- Person list: `personList`, `personListCursor`, `personItemsPerPage`
- Car search: `carSearchQuery`, `carSearchMode`, `filters`, `filtersOperator`,
  `carSearchCursor`, `carSearchResults`, `carItemsPerPage`
- Form resets: `personCreateKey`, `carCreateKey`
- Logging: `requestLog` from `EndToEndDemo/logging/demoLogger.ts`

Notes
- The demo renders only the active screen via `getActiveScreen`.

Car search behavior (`CarRelateScreen`)
- Quick query is criteria-driven and targets a selected field (`make` or `model`).
- Fulltext operators demonstrated in UI are `LIKE` and `STARTS_WITH`.
- `EQUALS` remains structural exact matching (non-fulltext).
- Structured filters are combined with `AND`/`OR` and demonstrate non-fulltext operator flows.
- The structured `IN` filter accepts comma-separated values and sends them as
  `FieldCriterion.valueOptions`.
- API-side routing is automatic: fulltext when applicable, otherwise structured/fallback paths.

How to add a new entity type screen
1. Extend the demo state in `EndToEndDemo/demoState.ts` (add type/mode/screen).
2. Create a screen in `EndToEndDemo/screens/` using the existing layout helpers.
3. Add hooks or extend existing hooks under `EndToEndDemo/hooks/` as needed.
4. Wire the screen into `EndToEndDemo.tsx` and update transitions.
