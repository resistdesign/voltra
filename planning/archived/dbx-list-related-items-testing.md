# Plan: Add DBX coverage for `list-related-items` (hydration + projection)

## Goal

Extend the existing DBX Relationships E2E suite to validate the **`list-related-items`** API route:

- route map wiring
- origin validation contract (from-side only)
- relationship → item hydration
- projection behavior
- paging/cursor behavior

## Scope

- Add ONE focused test block inside the existing `DBX_RELATIONSHIPS_E2E.test-utils.ts` scenario.
- Do NOT duplicate relationship coverage already proven by `list-relationships`.

## Tasks

### 1) Locate the right insertion point

- Find the point after relationship creation where we already have:
  - `createdAuthorIds`
  - `createdPostIds`
  - at least one author with multiple related posts

### 2) Add `list-related-items` calls (paging + projection)

- Make 2 calls for `author-1` → `posts` (or whatever the field is in the scenario):
  - Page 1: `itemsPerPage: 1`
  - Page 2: same origin + cursor from page 1
- Use a projection array matching the target type fields, e.g.:
  - `["id", "title"]` (or `["id","name"]`, etc—use the scenario’s real Post fields)

### 3) Assertions

- Verify `statusCode === 200` for both calls.
- Verify `targets.length === 1` for both pages.
- Verify the returned item `id` matches the expected post id order (stable ordering expectations).
- If response includes:
  - `missingReads` or similar: assert it is empty.
  - `cursor`: assert page1 has cursor and page2 cursor is either present (if more pages) or absent/null depending on
    contract.

### 4) Add failure-surfacing helper (optional but recommended)

- Add a tiny helper used only in this new block:
  - throws with `{ statusCode, parsedBody }` when statusCode !== 200
- Keep it local to the scenario file (no cross-file refactor).

### 5) Run and validate

- Run the DBX Relationships E2E suite locally.
- Confirm it passes in both:
  - in-memory DBX runtime
  - deployed demo stack (if applicable)

## Acceptance Criteria

- The suite fails if `list-related-items` is missing from the route map.
- The suite fails if origin validation incorrectly requires `toTypePrimaryFieldValue`.
- The suite fails if hydration/projection breaks (missing reads, wrong ids, empty targets).
- Existing relationship assertions remain unchanged and still pass.

## Task Tracking

- [x] Locate the right insertion point after relationship creation (author/post ids + multi-post author).
- [x] Add `list-related-items` paging calls with projection for the author → posts relationship.
- [x] Add assertions for status, ids/titles, projection keys, and cursor presence.
- [x] Add a local helper that throws `{ statusCode, parsedBody }` on non-200 responses.
- [x] Run and validate the DBX Relationships E2E suite.
