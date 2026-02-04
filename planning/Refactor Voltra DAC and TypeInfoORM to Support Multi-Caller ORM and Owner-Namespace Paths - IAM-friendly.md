# Plan: Refactor Voltra DAC + TypeInfoORM to Support Multi-Caller ORM + Owner-Namespace Paths (IAM-friendly)

NOTES: This plan is a marathon, not a sprint. SECURITY and correctness are the primary objectives.

## Context / Problem

Today, TypeInfoORM + DAC usage effectively binds “who is accessing” at the ORM instance / route-map wiring layer. That
leads to:

- ORM instances being created per request/caller (annoying, limits reuse/testing, makes composition harder).
- Difficulty integrating an external authorization backend like AWS IAM (or other policy engines) cleanly, because the
  DAC wants a resolved role at configuration time instead of per call.

We also want a scalable “ownership” model where:

- Ownership/tenancy can be expressed as a *prefix namespace* in the DAC resource path.
- That ownership value may live in another system (e.g. Cognito, IAM, side table), so resolving the owner key can
  require async IO.
- We do NOT want to “clobber” item schemas by forcing an `ownerId` field onto every model just to make DAC pathing work.

We converged on:

- Role-per-principal (root role per user/principal) as the primary entry point: `rootRoleId = user:{id}`.
- Keep DAC as “evaluate ALLOW/DENY constraints against resource paths”.
- Allow an optional async “owner namespace prefix” for a given `{typeName, primaryFieldValue}` so that constraints like
  `["own", "user:123"]` with `pathIsPrefix: true` can express “everything owned by this principal” as a single rule.
- Relationship ops must have two gates:
  1) existing relationship-type permission check (business logic / semantics)
  2) endpoint ownership/namespace validation for from/to items (ownership alone is not sufficient to create arbitrary
     relationships)

## Goals

- ORM instance can serve multiple callers (no per-request ORM instance requirement).
- DAC remains RBAC-friendly, IAM-friendly, and supports ALLOW + DENY.
- Caller supplies a per-call access context (root role id, and optional owner-prefix resolver).
- Relationship create/delete validates BOTH:
  - relationship permission (current behavior)
  - endpoint “ownership namespace” constraints (new behavior)

## Non-goals

- No new “user DAC system” separate from roles.
- No mandatory `ownerId` field on every item.
- Do not redesign indexing/search; keep scope to ORM + DAC + route map + tests/docs/demo.

---

## Proposed API Surfaces (Types)

### Static DAC config (instance-level)

```ts
import {LiteralValue} from "./TypeInfo";

export type TypeInfoORMDACConfig = {
  itemResourcePathPrefix: LiteralValue[];
  relationshipResourcePathPrefix: LiteralValue[];

  /**
   * Fetch a role by ID from an external system.
   * This is intentionally the "IAM hook" point: the role may be backed by IAM, DB, etc.
   */
  getDACRoleById: (roleId: string) => Promise<DACRole | undefined>;

  /**
   * OPTIONAL: Asynchronously returns an ownership/tenant prefix that should be
   * prepended to the canonical resource path for an item.
   *
   * If present, this enables constraints like:
   *   ["own", "user:abc"] (prefix allow)
   *
   * Implementations may call IAM/Cognito/etc to resolve ownership.
   */
  getOwnerPrefix?: (input: {
    typeName: string;
    primaryFieldValue: string;
  }) => Promise<LiteralValue[] | undefined>;
};
```

### Proposed ORM Method Signatures (Role Per Request)

(The doc comments, here, are for the purposes of this plan, and can be used as a source of information when updating
documentation, but are not intended to be definitive.)

```ts
import {LiteralValue} from "./TypeInfo";

/**
 * The API type for TypeInfoORM providers to implement.
 *
 * Accessing Role:
 * - `accessingRoleId` is OPTIONAL at the type level so callers can omit it when the ORM
 *   is not configured with DAC (in that case it is ignored).
 * - If the ORM *is* configured with DAC, providers MUST treat a missing `accessingRoleId`
 *   as an error (throw), because proceeding would be a security foot-gun.
 *
 * Note:
 * - The meaning and structure of `accessingRoleId` is intentionally opaque here.
 *   It represents “who is accessing” in whatever role model the application uses.
 */
export type TypeInfoORMAPI = {
  /**
   * Create a relationship record.
   */
  createRelationship: (
    relationshipItem: BaseItemRelationshipInfo,
    accessingRoleId?: LiteralValue,
  ) => Promise<boolean>;

  /**
   * Delete a relationship record.
   */
  deleteRelationship: (
    relationshipItem: BaseItemRelationshipInfo,
    accessingRoleId?: LiteralValue,
  ) => Promise<DeleteRelationshipResults>;

  /**
   * List relationships matching the query.
   */
  listRelationships: (
    config: ListRelationshipsConfig,
    accessingRoleId?: LiteralValue,
  ) => Promise<ListItemsResults<ItemRelationshipInfo>>;

  /**
   * List related items for a relationship query.
   */
  listRelatedItems: (
    config: ListRelationshipsConfig,
    accessingRoleId?: LiteralValue,
    selectedFields?: (keyof TypeInfoDataItem)[],
  ) => Promise<ListItemsResults<Partial<TypeInfoDataItem>>>;

  /**
   * Create an item.
   */
  create: (
    typeName: string,
    item: TypeInfoDataItem,
    accessingRoleId?: LiteralValue,
  ) => Promise<any>;

  /**
   * Read an item by primary field value.
   */
  read: (
    typeName: string,
    primaryFieldValue: any,
    accessingRoleId?: LiteralValue,
    selectedFields?: (keyof TypeInfoDataItem)[],
  ) => Promise<Partial<TypeInfoDataItem>>;

  /**
   * Update an item.
   */
  update: (
    typeName: string,
    item: TypeInfoDataItem,
    accessingRoleId?: LiteralValue,
  ) => Promise<boolean>;

  /**
   * Delete an item by primary field value.
   */
  delete: (
    typeName: string,
    primaryFieldValue: any,
    accessingRoleId?: LiteralValue,
  ) => Promise<boolean>;

  /**
   * List items matching the configuration.
   */
  list: (
    typeName: string,
    config: ListItemsConfig,
    selectedFields?: (keyof TypeInfoDataItem)[],
    accessingRoleId?: LiteralValue,
  ) => Promise<ListItemsResults<Partial<TypeInfoDataItem>>>;
};
```

### Resource path construction (existing + optional prefix)

- Existing canonical path building (do not remove): `DACUtils.getDataItemDACResourcePath(...)` and relationship
  equivalents.
- NEW behavior: before evaluating DAC constraints, prepend `ownerPrefix`, if available, *after* `itemResourcePathPrefix`
  or `relationshipResourcePathPrefix`.:
  - Example: `fullPath = [itemResourcePathPrefix, ...(ownerPrefix ?? []), ...basePath]`

### Relationship enforcement (merged rule)

For relationship create/delete:

- Gate A (existing): role must be allowed to perform that relationship operation on the relationship resource path.
- Gate B (new): role must be allowed (via prefixed paths) for BOTH endpoints (from + to), unless project explicitly adds
  a future config to relax this to either-side.

Default: **both endpoints required**, deny-wins.

---

## Implementation Plan (Phases + Checklist)

### Phase 0 — Inventory + Plan Anchors

- [ ] Locate current DAC config usage in `getTypeInfoORMRouteMap` and confirm where `accessingRole` / per-request
  binding is happening.
- [ ] Locate TypeInfoORM service entrypoints (CRUD + list + relationship ops) and map where DAC checks are performed.
- [ ] Locate current relationship DAC validation function(s) and how relationship resource paths are built/checked.
- [ ] Identify existing DBX/spec tests that assume request-bound ORM.

Deliverable: notes in this plan file with exact file paths and function names found.

---

### Phase 1 — Introduce Per-Call Access Context (No Behavior Change Yet)

Goal: Add the `TypeInfoORMAccess` parameter to ORM entrypoints, but keep existing behavior working via adapters.

- [ ] Define `TypeInfoORMAccess` type in the appropriate API module location (near ORM types).
- [ ] Update TypeInfoORM public methods to accept `access: TypeInfoORMAccess` (choose consistent arg position; prefer
  last arg for minimal churn).
  - [ ] createItem
  - [ ] readItem
  - [ ] updateItem
  - [ ] deleteItem
  - [ ] listItems
  - [ ] relationship operations (create/delete/listRelated/etc)
- [ ] Add an internal helper that resolves the effective root role:
  - [ ] `const rootRole = await dacConfig.getDACRoleById(access.rootRoleId)`
  - [ ] produce clear error if undefined (or treat as no permissions)
- [ ] Provide a backward-compat adapter for existing call sites (route map / legacy callers) that currently pass or
  embed accessing role:
  - [ ] Option A: update call sites immediately to pass `TypeInfoORMAccess`
  - [ ] Option B: keep legacy overloads temporarily (prefer A if feasible)

Success: everything compiles, tests may still fail until Phase 2+.

---

### Phase 2 — Add Optional Owner Prefix Injection to Item DAC Checks

Goal: Preserve canonical path building, add optional async prefix.

- [ ] Add owner-prefix application to the item DAC evaluation path:
  - [ ] When checking item permissions, compute basePath as today.
  - [ ] If `access.getOwnerPrefix` exists, `await` it with `{typeName, primaryFieldValue}`.
  - [ ] Prepend returned prefix to basePath before evaluating role constraints.
- [ ] Ensure the prefix is applied consistently wherever DAC checks items:
  - [ ] read/update/delete
  - [ ] list item filtering / access validation
  - [ ] any per-field checks that use resource paths (do not add “field lists” to access results; evaluate per-path as
    today)

Notes:

- Caching is intentionally left to the user’s `getOwnerPrefix` implementation.
- Keep the input minimal (typeName + primaryFieldValue).

---

### Phase 3 — Relationship Ops: Two Gates (Existing + Endpoint Ownership Validation)

Goal: keep relationship permission checks, add endpoint checks using `getOwnerPrefix` calls.

- [ ] Identify relationship operation validation entrypoint(s).
- [ ] Preserve Gate A: relationship resource path check as it exists today.
- [ ] Implement Gate B:
  - [ ] For `from` endpoint: call `getOwnerPrefix({fromTypeName, fromId})` and evaluate against *relationship base path*
    prefixed with fromPrefix.
  - [ ] For `to` endpoint: same with toPrefix.
  - [ ] Require BOTH endpoint checks to allow (default).
  - [ ] Deny wins if any check yields deny.
- [ ] Ensure that Gate B is only applied when `getOwnerPrefix` is present; otherwise behavior remains as close to
  current as possible.

---

### Phase 4 — Route Map / API Wiring Updates (Stop Per-Request ORM Instances)

Goal: `getTypeInfoORMRouteMap` (and any other API wiring) must pass access context per call.

- [ ] Update route map handlers so that for each request:
  - [ ] Resolve `rootRoleId` externally (from auth/JWT/IAM mapping).
  - [ ] Pass `TypeInfoORMAccess` into ORM method calls instead of constructing an ORM bound to accessing role.
- [ ] Ensure the route map can support “assume user” semantics by swapping `rootRoleId` (authorization for impersonation
  remains outside ORM).

---

### Phase 5 — Tests (DBX/spec) Coverage

Goal: update existing tests and add new specs validating the refactor.

- [ ] Update failing specs due to signature changes (per-call access arg).
- [ ] Add specs:
  - [ ] CRUD with rootRoleId allowing base paths (no owner prefix)
  - [ ] CRUD with owner prefix injection (single prefix allow grants access)
  - [ ] DENY overrides with owner prefix applied (ensure deny wins at equal specificity)
  - [ ] Relationship create/delete:
    - [ ] allowed by relationship permission but denied by endpoint ownership -> denied
    - [ ] allowed by endpoint ownership but denied by relationship permission -> denied
    - [ ] allowed by both -> allowed
- [ ] Run `yarn test`; use `yarn test:gen` only when fixtures need regeneration.

---

### Phase 6 — Docs + Demo

Goal: reflect new API in docs and update demo wiring.

- [ ] Update TypeDoc comments for:
  - [ ] `TypeInfoORMDACConfig`
  - [ ] `TypeInfoORMAccess`
  - [ ] owner prefix semantics
  - [ ] relationship two-gate semantics
- [ ] Update docs site usage examples (where ORM access is shown) to pass `TypeInfoORMAccess`.
- [ ] Update demo app/API setup (route map or equivalent) to:
  - [ ] provide rootRoleId per request
  - [ ] optionally provide `getOwnerPrefix` example (even if simple)
- [ ] Verify docs build steps still work (`yarn doc`, `yarn site:build:app` if required by CI expectations).

---

## Migration Notes / Compatibility Strategy

- Prefer to update call sites directly rather than maintain long-lived overloads.
- If temporary compatibility is required, implement it at the route-map layer, not inside the ORM core.

---

## Acceptance Criteria

- ORM instance is reusable across multiple callers; per-call access provided via `TypeInfoORMAccess`.
- `getDACRoleById` remains the single required external “policy backend” hook.
- Optional `getOwnerPrefix` enables owner/tenant namespace prefixing for item resource paths.
- Relationship ops enforce two-gate rule (relationship permission + endpoint validation).
- Tests updated + added; demo updated; docs updated.

---

## Codex Execution Notes (per AGENTS.md)

- Work strictly in plan order.
- Update this plan file as checklist items complete.
- Keep changes scoped to the refactor (avoid unrelated tidy-ups).
- Run `yarn test` after each phase that changes behavior.
- End each work log with a single `Next:` line referencing the next unchecked checklist item.

Next: Phase 0 — locate exact current DAC wiring in `getTypeInfoORMRouteMap` and enumerate the current per-request
binding points.

---

## Footnotes / Clarifications

### 1. Security Semantics of `accessingRoleId` (IMPORTANT)

The `accessingRoleId` parameter on ORM methods is **optional at the type level only**, but **not optional at runtime
when DAC is enabled**.

Rules:

- If **DAC is NOT configured** on the ORM instance:
  - `accessingRoleId` is ignored.
  - The ORM behaves as it historically has (no DAC enforcement).
- If **DAC IS configured** on the ORM instance:
  - A missing `accessingRoleId` **MUST cause the operation to throw**.
  - Proceeding without an explicit access context is considered a security error.

This is an intentional “fail closed” design to:

- prevent silent authorization bypass
- avoid foot-guns where access context is accidentally omitted
- make security failures obvious and debuggable

In short: **If the ORM expects DAC, it requires an explicit `accessingRoleId`.**

**IMPORTANT: SECURITY: This functionality should probably be centralized where the DAC privelages are calculated so that
all methods using the DAC will **AUTOMATICALLY THROW** if the `accessingRoleId` is missing when DAC is expected.**

---

### 2. Purpose and Correct Usage of `getOwnerPrefix`

`getOwnerPrefix` exists to support **owner / tenant / namespace scoping** in DAC **without embedding ownership fields
into data models**.

Key properties:

- `getOwnerPrefix` is **static configuration**, not request-scoped.
- The same item is assumed always resolve to the same owner prefix, regardless of who is accessing it. Although, the
  specific application may make decisions about dynamic ownership on its own.
- The function will be **async** so that it may perform external IO.
- Ownership resolution may come from:
  - AWS IAM
  - Cognito
  - a side table
  - an external service
  - any other authoritative system

Behavior:

- If provided, the returned prefix is inserted **after** the application resource path prefix:

  `fullPath = [...appResourcePathPrefix, ...ownerPrefix, ...basePathRemainder]`

  Where:
  - `appResourcePathPrefix` is `itemResourcePathPrefix` or `relationshipResourcePathPrefix`
  - `basePathRemainder` is the canonical resource path content that follows the app prefix

- This enables compact DAC constraints such as:

  `ALLOW ["own", "user:123"] (pathIsPrefix: true)`

  meaning “this role may access all resources owned by `user:123`”.

Non-goals:

- `getOwnerPrefix` does **not** determine who is accessing.
- It does **not** bypass relationship permissions.
- It does **not** alter canonical resource path construction.
- Ownership alone does **not** imply permission.

Ownership is treated as **context**, not authority.

---

### 3. Relationship Operations: Ownership ≠ Permission

Relationship create/delete operations are intentionally gated by **two independent checks**:

1. **Relationship Permission (existing behavior)**  
   The acting role must be allowed to perform the relationship operation itself
   (for example: “is allowed to create a `MemberOf` relationship”).

2. **Endpoint Ownership / Namespace Validation (new behavior)**  
   The acting role must be allowed — via prefixed resource paths — to access:

- the `from` item
- **and** the `to` item

Both checks must pass.

This prevents cases where:

- a role owns both items but is not allowed to semantically connect them
- ownership alone implies unintended business meaning

Default behavior:

- **both endpoints required**
- **deny always wins**

---

### 4. IAM Integration Is a First-Class Design Goal

This refactor is intentionally designed to integrate cleanly with external policy engines such as **AWS IAM**.

Expected integration pattern:

- IAM (or similar) is responsible for:
  - mapping caller identity → `accessingRoleId`
  - defining role membership and constraints
- `getDACRoleById` acts as the primary adapter:
  - fetches role definitions
  - translates IAM policy into `DACRole` structures
- `getOwnerPrefix` may also be backed by IAM:
  - resource ARN ownership
  - tag-based ownership
  - policy simulation or lookup results

IAM-specific helpers or drivers are expected to live in the **API layer**, outside of `getTypeInfoORMRouteMap`.

The route map should consume already-resolved role IDs and helpers, not embed IAM logic itself.

---

### 5. Intentional Non-Features (By Design)

The following are explicitly **not** part of this design:

- No implicit “public” role
- No default access context
- No in-built, automatic ownership inference (External methods are expected to provide this)
- No coupling between user identity and data schema

All of these concerns are intentionally left to **explicit application policy**, where they can be reasoned about,
tested, and audited.
