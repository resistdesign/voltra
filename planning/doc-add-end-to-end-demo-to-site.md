# Plan: doc/add-end-to-end-demo-to-site

## Overview
We are building a new E2E demo app inside the docs site that exercises the
Voltra ORM and indexing stack end-to-end. The backend already exposes a
DynamoDB-backed ORM route map at `/db` via `ROUTE_MAP_WITH_DB`
(`site/api/routeMap.ts`), using the TypeInfo map generated from
`site/common/Types.ts` into `site/common/DemoTypeInfoMap.json`. The existing
`AdvancedDemo` only showcases dynamic form generation from in-browser TypeScript
parsing; the new demo must instead use the prebuilt TypeInfo map and make real
API calls to the ORM + indexing routes for CRUD, list, relationships, and
search (full-text lossy + exact, plus structured queries).

The UI will live in `site/app/src/client/` and be wired into
`site/app/src/client/App.tsx` as a new route and nav entry. It should
demonstrate `Person` and `Car` types from `site/common/Types.ts`, and leverage
`useFormEngine` + `AutoFormView` from `src/app/forms` to render forms. API calls
should be routed through `TypeInfoORMClient` (`src/app/utils/TypeInfoORMClient.ts`)
with a service config pointing at the API domain and base path `/db`. We need
clear flows for: create/read/update/delete/list, relationship create/delete/list,
and search for full-text (lossy/exact) and structured criteria, plus visible
error/result feedback for each operation. The plan below breaks this into
primitive tasks so the work can resume across sessions with context intact.

## Checklist
- [x] Review demo API entry points and ORM route wiring (`site/api/routeMap.ts`, `site/api/index.ts`, `src/api/ORM/ORMRouteMap.ts`).
- [x] Review demo type pipeline and TypeInfo map generation (`site/common/Types.ts`, `site/common/DemoTypeInfoMap.ts`, `site/build-demo-types.ts`).
- [x] Review existing form generation demo and app routing (`site/app/src/client/AdvancedDemo.tsx`, `site/app/src/client/App.tsx`, `src/app/forms/*`, `src/app/utils/TypeInfoORMClient.ts`).
- [ ] Define E2E demo goals and user flows (CRUD, list, relationships, search: lossy + exact + structured) for `Person` and `Car`.
  - [ ] List exact user flows to cover (Create, Read by ID, Update, Delete, List, Relationship create/delete/list, Full-text search, Structured search).
  - [ ] Decide which flows are primary vs secondary UI actions.
- [ ] Lock relationship strategy (manual relationship create/delete/list via relationship routes).
- [ ] Decide API client config strategy (base path `/db`, domain selection for local vs prod, auth header handling) and where it lives in `site/app`.
  - [ ] Document expected API host for local + prod, and how it is chosen in the UI.
  - [ ] Decide whether the client config is global context, per-demo config, or local state in the demo component.
- [ ] Define request/response transparency requirements (show payloads for all operations).
- [ ] Draft UI composition plan for the E2E demo (type picker, list pane, form pane, detail/relationship pane, search controls, action feedback).
  - [ ] Sketch component breakdown (layout + major panels + shared widgets).
  - [ ] Define navigation entry (route path, header label, nav link placement).
  - [ ] Determine how request/response and error states are visualized.
- [ ] Specify data flow per action (create/read/update/delete/list/relationship ops/full-text + structured search) and how form state syncs with API responses.
  - [ ] Define how form values map to API payloads for `create`/`update`.
  - [ ] Define how list results hydrate selection and form values.
  - [ ] Define relationship payloads for `createRelationship`/`deleteRelationship` and list queries.
  - [ ] Define search config payloads for full-text (lossy/exact) and structured criteria.
- [ ] Plan demo data seeding/reset strategy and failure states (empty lists, missing IDs, validation errors, indexing errors).
  - [ ] Decide on seed dataset shape and whether it is client-generated or API-provided.
  - [ ] Define "reset" behavior (clear local state only vs delete server data).
  - [ ] Enumerate error handling behaviors and user messaging.
- [ ] Identify docs/site navigation updates (new route, nav link, page copy) and any assets needed.
  - [ ] Decide page copy and explanation text for demo usage.
  - [ ] Identify any new images or diagrams for the demo page.
- [ ] Note validation steps (manual smoke run, optional `yarn site:build:app`, `yarn site:build:demo-types`).
  - [ ] List manual smoke checklist (load demo, create item, list item, search, relationship ops).
