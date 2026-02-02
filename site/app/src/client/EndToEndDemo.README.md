# EndToEndDemo map

Entrypoints
- Route wiring: `site/app/src/client/App.tsx` ("/end-to-end-demo")
- Demo component: `site/app/src/client/EndToEndDemo.tsx`

Current sections (render order)
1. Create a Person
   - New Person form
   - People list (cursor paging + items per page)
2. Person Details & Update
   - Selected person update/delete form
   - Read-only JSON view
3. Manage Car Relationship
   - Current relationship summary + remove
   - Car search (text/structured, paging) + results + select
   - Create new car form
   - Related car update/delete form
4. Request / Response Log
   - Log list with request/response payloads + clear

State sources in `EndToEndDemo.tsx`
- Selection: `selectedPersonId`, `selectedPerson`, `selectedCarCandidate`
- Relationship: `relatedCarId`, `relatedCar`, `relatedCarSummary`
- Person list: `personList`, `personListCursor`, `personItemsPerPage`
- Car search: `carSearchQuery`, `carSearchMode`, `filters`, `filtersOperator`,
  `carSearchCursor`, `carSearchResults`, `carItemsPerPage`
- Form resets: `personCreateKey`, `carCreateKey`
- Logging: `requestLog`

Notes
- All sections currently render in one long page; visibility is only conditional
  inside sections based on selection state.
