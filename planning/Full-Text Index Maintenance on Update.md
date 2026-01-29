# Voltra Plan: Full-Text Index Maintenance on Update

## Goal

Ensure **full‑text indexes are fully maintained** (no stale tokens) when an item is **updated**, matching the correctness we already have for **delete**.

Success = after an update, full‑text searches reflect **only** the latest item content.

---

## Problem Summary

Today, the update flow indexes full‑text by **adding postings** for the updated item but does **not remove** postings for tokens that existed before the update.

* `TypeInfoORMService.update()` calls `indexFullTextDocument(typeName, updatedItem)`.
* Full‑text `indexDocument(...)` adds postings/positions.
* Old tokens remain searchable → **stale results**.

---

## Strategy

Make update full‑text indexing a **replace** operation:

> On update, remove the doc’s prior full‑text tokens, then index the new tokens.

This is simplest + most reliable. It mirrors how structured indexing diffs fields.

### Key requirements

* Use the **previous persisted item** as the source of truth for tokens to remove.
* Ensure replace is **safe** even if remove/index is retried.
* Keep existing delete behavior.

---

## Implementation Plan

### 1) Introduce a “replace” API for full‑text

Create a function in `src/api/Indexing/API.ts` (or wherever the full‑text API boundary lives) that performs:

* `removeDocument(typeName, previousItem)`
* `indexDocument(typeName, nextItem)`

Name suggestion:

* `replaceFullTextDocument(typeName, prevItem, nextItem)`

Notes:

* Do **not** change structured behavior.
* Keep remove/index as separate internal ops, but expose a clear “replace” intent.

Deliverables:

* New exported function.
* Unit tests for `replace*` (if there are unit tests for indexing API; otherwise cover via DBX/E2E).

### 2) Update ORM update flow to call replace

In `src/api/ORM/TypeInfoORMService.ts`:

Current shape:

* `driver.updateItem(...)`
* `driver.readItem(...)`
* `indexStructuredDocument(...)`
* `indexFullTextDocument(...)`

Change to:

* `const existingItem = await driver.readItem(typeName, id)` **before** update (or use a driver method that returns previous value if available)
* `await driver.updateItem(...)`
* `const updatedItem = await driver.readItem(...)`
* `await indexStructuredDocument(typeName, updatedItem)` (unchanged)
* `await replaceFullTextDocument(typeName, existingItem, updatedItem)`

Edge cases:

* If `existingItem` doesn’t exist, treat as create semantics.
* If `updatedItem` is missing post-update, error.

Important:

* No early returns.
* Keep ordering deterministic.

### 3) Ensure create path stays efficient

Create should remain:

* `indexFullTextDocument(typeName, createdItem)`

No need to remove first.

### 4) Re-check delete path for correctness

Delete currently:

* `removeFullTextDocument(typeName, existingItem)`

Keep it.

Add/confirm behavior:

* If item has no full‑text fields, remove should be a no-op.

### 5) Audit all call-sites for update full-text indexing

Search for direct uses of:

* `indexFullTextDocument`
* `indexDocument`
* `removeFullTextDocument`
* `removeDocument`

Confirm:

* Only ORM update needed change.
* Any other “update-like” flows (bulk upserts, seeders, admin tools) either:

  * call ORM update (so they’re fixed), or
  * must be updated to call replace.

Deliverables:

* A short checklist of call-sites touched.

### 6) Add DBX/E2E tests proving no staleness

Add (or extend) a DBX spec to cover:

Scenario: Full‑Text index maintenance on update

1. Create an item with a full‑text field containing token A.
2. Verify search for token A returns the item.
3. Update the item so token A is removed and token B is present.
4. Verify:

  * search for token A **does not** return the item
  * search for token B **does** return the item

Also cover:

* Update that sets field to empty/null should remove old tokens.
* Update that changes only non-fulltext fields should not break.

Where to put it:

* If there’s an existing “search” DBX suite, add to it.
* Otherwise create `DBX_FullText_Update_Maintenance` scenario/spec.

### 7) Consider transactionality + failure modes (documented)

We’re doing two operations (remove then add). If we crash between them:

* The doc may temporarily disappear from full‑text results.

Mitigation options (pick one, document why):

* Accept eventual consistency (simplest, likely OK).
* Add a best-effort retry policy at call-site.
* If the full‑text driver supports atomic replace, implement later.

Deliverable:

* Add a short note in the plan doc comments or a small `README` section near indexing.

### 8) Run + update any impacted consumers

Anything that depends on stale behavior (unlikely but possible) may now change.

Tasks:

* Run full test suite.
* Run demo DB seeder + sanity queries.
* If there is a UI search demo, verify manually:

  * old tokens stop matching after update.

---

## Files Likely Touched

* `src/api/Indexing/API.ts` (new replace op + wiring)
* `src/api/ORM/TypeInfoORMService.ts` (update flow changes)
* DBX test files for search/full-text
* Any scripts that bypass ORM and call full‑text indexing directly

---

## Definition of Done

* Update does not leave stale full‑text tokens.
* DBX test proves it.
* No other indexing modes regress.
* Seeder + demo site searches behave correctly.

---

## Quick Self-Review Checklist (for Codex)

* [x] Update path reads `existingItem` before update and uses it for removal
* [x] Create path unchanged
* [x] Delete path unchanged
* [x] Replace is used in any non-ORM update flows
* [x] DBX spec added and passes
* [x] No unrelated changes
