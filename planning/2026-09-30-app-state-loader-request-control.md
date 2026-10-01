# App State Loader request control

Goal: make Voltra's application-state loader sufficient for stateful UI flows that must keep normal application-state identifiers while also coordinating request success/failure/cancellation imperatively.

## Phase 1 — Define the loader contract

- [x] Confirm the current loader owns application-state updates, loading/error state, request sequencing, and optional cancel-on-new-request behavior.
- [x] Confirm the current imperative method returns `Promise<void>` and therefore cannot tell an awaiting caller whether a void RPC succeeded, failed, or was superseded.
- [x] Confirm manual loaders have no first-class way to cancel/invalidate an in-flight request without starting another request.
- [x] Preserve existing application-state behavior and compatibility for callers that ignore the imperative return value.

## Phase 2 — Implement first-class request results and cancellation

- [ ] Add a typed request-result union for success, error, and cancelled/superseded requests.
- [ ] Make `makeRemoteProcedureCall()` return that result while continuing to update the identified application-state value on success and loader error state on failure.
- [ ] Add `cancelPendingRequest()` to invalidate and abort the loader's current request without issuing a replacement request.
- [ ] Thread an external abort signal through the shared service request helper without weakening existing `cancelPendingOnNewRequest` behavior.

## Phase 3 — Tests and documentation

- [ ] Add JSON-spec coverage for success/error request results.
- [ ] Add JSON-spec coverage proving explicit cancellation aborts the fetch, does not commit state/error, and returns a cancelled result.
- [ ] Preserve existing cancel-on-new-request coverage.
- [ ] Document the new public result and cancellation contracts.

## Phase 4 — Verification and PR

- [ ] Run focused loader specs.
- [ ] Run the core test suite and build/type/export checks appropriate to the public app API.
- [ ] Review the final diff for unrelated changes.
- [ ] Move this plan to `planning/complete/` and open a PR against `main`.

## Consumer requirement

Engayge Friend Finder is the motivating production consumer. It must be able to retain its `SUGGEST` and `DECIDE` application-state identifiers/RPC loaders while awaiting explicit success/failure for decision handoff and cancelling stale requests on filter/session changes. The Voltra primitive should solve this generically; Engayge should not maintain a parallel request/state framework.
