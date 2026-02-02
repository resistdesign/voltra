# Voltra — E2E Demo UX Integration Refactor Plan (State-Driven “App”)

## Goal

Turn the current End-to-End ORM Demo from a static “section wall” into a state-driven mini-app
that feels integrated: views/screens change based on the active data type and the user’s current intent
(create / list / detail / relate), while keeping all existing capabilities.

## Non-Goals

- No backend/ORM behavior changes (unless a UI contract bug is discovered).
- No major visual redesign; prioritize structure + flow.
- No router requirement (can be done with a lightweight local state machine).

## Success Criteria

- On initial load, the demo presents a single coherent “starting screen” (not all sections at once).
- Selecting/creating a Person moves the user into a Person-focused screen.
- “Manage Car Relationship” becomes a contained flow that temporarily focuses on Car search/selection.
- The request/response log remains available but does not dominate or distract.
- E2E demo remains fully functional and easy to extend with new entity types.

---

## Phase 0 — Baseline + inventory (no behavior change)

- [x] Locate the E2E demo entrypoint + components (likely under `site/`).
- [x] Identify the current “sections” and their boundaries:
  - Create Person form
  - People list (paging)
  - Person detail/update/delete
  - Relationship management (Person ↔ Car)
  - Car search / create / update / delete (if currently present)
  - Request/response log
- [x] Note existing state sources:
  - selected person id
  - selected car id
  - paging cursor(s)
  - search query + mode
  - log store
- [x] Run locally and validate current behavior before refactor.
  - Command: `yarn start`
  - Optional: `yarn site:build:app` to ensure build stays green.

Deliverable:
- [x] A short “map” comment/doc inside the demo folder (or a small `README.md` next to the demo code) listing the above.

Next: Define the app context + view model boundaries.

---

## Phase 1 — Introduce “Demo App Context” (state model + reducer)

### 1A. Define the minimal state model

 - [x] Add a single source of truth for demo navigation/state, e.g.:
  - `activeType`: `"Person" | "Car"`
  - `activeId`: string | null (the selected entity id for the activeType)
  - `mode`: `"list" | "create" | "detail" | "relate"`
  - `relate`: `{ fromType: "Person", fromId: string } | null`
  - Keep existing granular state (forms/search/paging) but route visibility via this model.

Suggested file(s) (pick the closest matching convention where the demo lives):
- [x] `site/app/src/client/endToEndDemo/demoState.ts`

### 1B. Implement reducer/actions

- [x] Actions:
  - `goToPeopleList`
  - `startCreatePerson`
  - `selectPerson(personId)`
  - `enterPersonDetail(personId)`
  - `startRelateCar(personId)`
  - `selectCarForRelate(carId)`
  - `confirmRelateCar(carId)`
  - `exitRelateBackToPerson`
  - `clearSelection`
- [x] Ensure actions are pure transitions; do not embed API calls in reducer.
- [x] Add a tiny “view selector” helper:
  - `getActiveScreen(state): "PeopleHome" | "PersonDetail" | "CarRelate" | ...`

Deliverable:
- [x] State model + reducer in place.
- [x] No UI changes yet besides wiring.

Next: Create 3–5 “screens” that wrap existing sections.

---

## Phase 2 — Convert sections into Screens (visibility + flow)

### 2A. Define Screen components (wrappers around existing UI)

- [x] `PeopleHomeScreen`
  - Shows: People list + primary CTA “Create Person”
  - Optional: small create form inline or button to open create mode
- [x] `CreatePersonScreen`
  - Shows: Create Person form
  - On success: auto-select the created Person and transition to `PersonDetailScreen`
- [x] `PersonDetailScreen`
  - Shows: Person detail/update/delete
  - Includes entrypoint to relationship flow (“Manage Car Relationship”)
- [x] `CarRelateScreen`
  - Shows: Car search + select + confirm relationship
  - Optional: Create car inline if no result
  - On confirm: transition back to `PersonDetailScreen`
- [~] `DebugLogPanel` (persistent)
  - Persists across screens; dock/collapse pending

Suggested structure:
- [x] `site/app/src/client/endToEndDemo/screens/PeopleHomeScreen.tsx`
- [x] `site/app/src/client/endToEndDemo/screens/CreatePersonScreen.tsx`
- [x] `site/app/src/client/endToEndDemo/screens/PersonDetailScreen.tsx`
- [x] `site/app/src/client/endToEndDemo/screens/CarRelateScreen.tsx`
- [x] `site/app/src/client/endToEndDemo/components/DebugLogPanel.tsx`

### 2B. Wire screen switching (no router)

- [x] In the demo root component:
  - render `screen = getActiveScreen(state)`
  - mount only the active screen component
- [x] Keep shared API client + logging store available to all screens via props.

Deliverable:
- [x] Initial load shows PeopleHomeScreen.
- [x] Nothing “below” is visible until state warrants it.

Next: Normalize selection + transitions (make it feel “stitched”).

---

## Phase 3 — Make the flow feel integrated (transitions + affordances)

### 3A. Tighten cause/effect transitions

- [ ] Create Person success:
  - set as active selection
  - jump to PersonDetailScreen
- [ ] People list item click:
  - set active selection
  - jump to PersonDetailScreen
- [ ] Delete Person:
  - clear selection
  - jump back to PeopleHomeScreen and refresh list
- [ ] Start relationship:
  - jump to CarRelateScreen with `relate.fromId = personId`
- [ ] Confirm relationship:
  - jump back to PersonDetailScreen (same person)
  - refresh person read and relationship display

### 3B. Navigation affordances (minimal)

- [ ] Add a small top “context bar”:
  - `People` (back to list)
  - If person selected: `Person: <name>` (current)
  - If in relate mode: `Relating Car → Person: <name>`
- [ ] Keep it dumb: it only dispatches context actions.

Deliverable:
- [ ] The demo feels like one app, not a stack of independent sections.

Next: Clean up shared logic (extract reusable hooks/utilities).

---

## Phase 4 — Extract shared logic + reduce duplication

### 4A. API call hooks (no behavior changes)

- [ ] Create `usePeople()` for list/read/create/update/delete
- [ ] Create `useCars()` for search/read/create/update/delete
- [ ] Create `useRelationship()` for relate/unrelate and fetching current related car
- [ ] Ensure request/response log integration is consistent:
  - Every hook call logs request + response uniformly.

Suggested file(s):
- [ ] `site/src/app/demos/e2e/hooks/usePeople.ts`
- [ ] `site/src/app/demos/e2e/hooks/useCars.ts`
- [ ] `site/src/app/demos/e2e/hooks/useRelationship.ts`
- [ ] `site/src/app/demos/e2e/logging/demoLogger.ts`

### 4B. Shared form state helpers

- [ ] Consolidate duplicated form field parsing/validation UI behaviors.
- [ ] Ensure required fields clearly map to API validation errors.

Deliverable:
- [ ] Screens become mostly composition + dispatch, not API plumbing.

Next: Stabilize demo UX defaults (load behavior, empty states, refresh cues).

---

## Phase 5 — UX polish (small but meaningful)

- [ ] Empty states:
  - People list: “No people yet — create one to continue.”
  - Person detail: “Select a person from People.”
  - Car relate: “Search cars or create one, then attach.”
- [ ] Loading states:
  - Disable submit buttons while pending
  - Add inline “loading…” (simple text is fine)
- [ ] Make log panel:
  - Collapsed by default
  - Sticky toggle (bottom-right or top-right)
  - Clear log button stays
- [ ] Ensure “items per page” defaults are consistent.

Deliverable:
- [ ] Demo is pleasant to use and explains itself through flow.

Next: Add/update tests and documentation notes.

---

## Phase 6 — Tests + verification

### 6A. Keep backend specs unchanged (unless UI uncovered a bug)

- [ ] Run:
  - `yarn test`
  - `yarn build`
  - `yarn site:build:app`

### 6B. If there are UI tests in repo, add minimal coverage

- [ ] Add one basic “happy path” UI check if infrastructure exists:
  - create person → appears in list → open detail → start relate → attach car → relationship visible
- [ ] If no UI test infra exists, add a small manual QA checklist to this plan (below).

Manual QA checklist:
- [ ] Load demo → PeopleHomeScreen visible, others hidden
- [ ] Create Person → transitions to PersonDetailScreen
- [ ] Update Person → persists + re-reads
- [ ] Delete Person → returns to PeopleHomeScreen and list updates
- [ ] Start relate flow → CarRelateScreen; attach a car → returns to detail with relationship shown
- [ ] Unrelate/remove → returns to detail, relationship cleared
- [ ] Log panel shows calls across all screens and can be cleared

Deliverable:
- [ ] All commands green; QA checklist passes.

Next: Final cleanup and doc touch-ups.

---

## Phase 7 — Cleanup + docs

- [ ] Remove dead/unused components created by old section layout.
- [ ] Ensure file naming follows repo conventions.
- [ ] Add a short section to the demo’s local README:
  - Screens
  - DemoContext state model
  - How to add a new entity type screen

Deliverable:
- [ ] Refactor lands without breaking the site build.

---

## Notes / Implementation Guidance

- Prefer composition over “mega component” patterns.
- Keep the reducer pure; perform API calls inside screens/hooks.
- Avoid clever state sync; one-way transitions are the point.
- Preserve existing styling as much as possible; focus on flow and integration.

Next: Phase 0 — Baseline + inventory (locate demo entrypoint + section map).
