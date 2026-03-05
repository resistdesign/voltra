# Voltra Plan: Fix addGateway Authorizer Typing + Auth Pack ID Config

## Goal
Fix two problems when wiring API Gateway REST auth with Cognito User Pools:

- **(2) Typing bug:** `addGateway(...).authorizer.providerARNs` must accept CloudFormation intrinsics (e.g. `Fn::GetAtt`) the same way other packs do.
- **(3) ID coupling:** Consumers shouldn’t need to guess internal resource-id suffixes (or any naming conventions) to reference resources created inside `addAuth` / `addUserManagement`.

---

## Phase 0 — Locate Current Types + Conventions
- [ ] Find `addGateway` authorizer config type.
- [ ] Find what Voltra uses elsewhere for “string or intrinsic” values (e.g. `CloudFormationPrimitiveValue<string>` or similar).
- [ ] Confirm the current `addUserManagement` naming scheme for all created resources (UserPool, Client, IdentityPool, roles, attachments, domain pieces).

Files to inspect (likely):
- [ ] `src/iac/packs/gateway.ts`
- [ ] `src/iac/packs/auth.ts`
- [ ] `src/iac/packs/auth/user-management.ts`
- [ ] Any shared CFN value typing utilities under `src/iac/*` (types/helpers)

---

## Phase 1 — Fix addGateway Authorizer Typing (Issue 2)

### Requirements
- `authorizer.providerARNs` must accept both literal strings and CFN intrinsics.
- Keep runtime output the same when given plain strings.
- Keep config surface area minimal.

### Changes
- [ ] Update the authorizer config type so `providerARNs` is typed as an array of Voltra’s CFN string primitive type.
  - Example target:
    - `providerARNs?: CloudFormationPrimitiveValue<string>[]`
- [ ] Ensure any internal helpers or merges in `addGateway` still work with this type.
- [ ] If `identitySource` has a default, ensure it’s defined and documented.
  - [ ] Consider defaulting to `method.request.header.Authorization` (case matches common AWS examples).

### Tests
- [ ] Add/update a unit test/fixture that passes `providerARNs: [{ 'Fn::GetAtt': ['UserPool', 'Arn'] }]` and asserts it appears in the generated template.
- [ ] Add/update a unit test/fixture that passes `providerARNs: ['arn:...']` and asserts it appears unchanged.

### Deliverable
- [ ] Voltra build passes.
- [ ] Typescript no longer requires `any` for `Fn::GetAtt` in `providerARNs`.

---

## Phase 2 — Add Optional ID Config to addUserManagement + Pass Through addAuth (Issue 3)

### Requirements
- Consumers can optionally supply explicit resource ids for resources created by `addUserManagement`.
- Every id in the config is optional.
- If not supplied, Voltra uses the existing default naming scheme (no breaking changes).
- `addAuth` should expose this capability without changing pack return types.

### API Proposal

Add to `addUserManagement` config:

- `ids?: UserManagementIds`

Where:

- `UserManagementIds` includes ids for:
  - [ ] `userPool`
  - [ ] `userPoolClient`
  - [ ] `identityPool`
  - [ ] `authRole`
  - [ ] `unauthRole`
  - [ ] `roleAttachment`
  - [ ] Domain-related ids (only used when domain enabled):
    - [ ] `domain`
    - [ ] `domainRecord`
    - [ ] `baseDomainRecord`

### Implementation Steps
- [ ] Define `UserManagementIds` type near `addUserManagement` (or in a shared auth types file).
- [ ] In `addUserManagement`, replace hardcoded concatenations like `${id}Client` with:
  - `const idsResolved = resolveUserManagementIds(id, ids)`
  - Use `idsResolved.userPoolClient`, etc.
- [ ] Implement `resolveUserManagementIds(baseId, ids?)`:
  - [ ] Returns a fully-populated `Required<UserManagementIds>` using current defaults.
- [ ] Update `addAuth` config to accept optional `userManagementIds?: UserManagementIds`.
  - [ ] Thread through to `addUserManagement` via its config.

### Tests
- [ ] Fixture without ids config produces the exact same template output as before.
- [ ] Fixture with a partial ids config overrides only those ids and keeps the rest default.

### Deliverable
- [ ] Stacks can reference auth resources without guessing naming conventions.

---

## Phase 3 — Ergonomic Helper (Optional)

### Goal
Give stack authors a no-guess helper for ids even when they don’t want to override.

- [ ] Export `getUserManagementIds(baseId)` (or similar) that returns resolved ids.
- [ ] Ensure the helper is pure and has no template side effects.

---

## Phase 4 — Docs + Example
- [ ] Update README/docs for `addGateway` authorizer usage:
  - [ ] Show `authorizer.providerARNs` example with `Fn::GetAtt`.
- [ ] Update auth docs for `addAuth` / `addUserManagement` ids config:
  - [ ] Show partial override example.
  - [ ] Show how to reference user pool arn via resolved ids.

---

## Acceptance Criteria
- [ ] `addGateway` authorizer accepts CFN intrinsics without `any` casts.
- [ ] `addUserManagement` supports optional explicit ids, with backwards-compatible defaults.
- [ ] `addAuth` exposes the ids config pass-through.
- [ ] Tests cover both default behavior and override behavior.
- [ ] One new Voltra release can ship these changes.
