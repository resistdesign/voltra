# Plan — Fix demo site API Lambda error: `valueFields is not iterable`

## Context
CloudWatch shows:
- Route: `"db"/"list"`
- Error: `TypeError: valueFields is not iterable`
- Stack:
	- `validateTypeOperationAllowed` (`/src/common/TypeParsing/Validation.ts:524`)
	- `TypeInfoORMService.validateReadOperation` (`/src/api/ORM/TypeInfoORMService.ts:1079`)
	- `TypeInfoORMService.list` (`/src/api/ORM/TypeInfoORMService.ts:1963`)
	- route handler created in `src/api/ORM/ORMRouteMap.ts` (stack line shows ~130)

Hypothesis to validate:
- In the DAC-enabled wrapper in `src/api/ORM/ORMRouteMap.ts`, `context` is being appended in a way that shifts optional args.
- When `selectedFields` is omitted, `context` is landing in the `selectedFields` position.
- Downstream validation expects `selectedFields.valueFields` (or similar) to be iterable; it isn’t.

---

## Phase 0 — Repro + pinpoint (no code changes)

- [~] Capture the exact failing invocation
	- [ ] In CloudWatch logs, confirm the `LOGGING_FUNCTION_CALL INPUT "db"/"list"` args are exactly:
		- `["Person", { "itemsPerPage": 5 }]`
	- [ ] Confirm the error is thrown before any DynamoDB calls (the stack should be purely validation + routing).
	- Remaining: CloudWatch access/verification.

- [x] Locate the exact throw site
	- [x] Open `src/common/TypeParsing/Validation.ts`.
	- [x] Go to/around line ~524 (from stack).
	- [x] Identify the variable named in the error path:
		- e.g. a loop like `for (const x of valueFields)`.
	- [x] Record:
		- the variable name (`valueFields`)
		- what it’s *supposed* to be (array of fields? iterable?)
		- what property it’s derived from (ex: `selectedFields.valueFields`).

- [x] Confirm the wrapper is passing the wrong thing
	- [x] Open `src/api/ORM/ORMRouteMap.ts`.
	- [x] Go to around the stack line (shows ~130).
	- [x] Identify the handler for `"db"/"list"`.
	- [x] Find the DAC wrapper path (the code path that adds `context`).
	- [~] Add a temporary, local-only debug (do not commit) to print:
		- `args.length`
		- `typeof args[last]`
		- whether the last arg resembles the context object.
	- Note: confirmed by code path inspection and regression tests instead of temporary logging.

Acceptance for Phase 0:
- [x] We can clearly state: “`context` is being used as `selectedFields` when the caller omits selectedFields.”

---

## Phase 1 — Implement a targeted routing fix (minimal blast radius)

### Goal
Fix only the routes whose underlying service signatures end with:
- `(..., selectedFields?, context?)`

### Step 1: Inventory the signatures (source of truth)
- [x] Open `src/api/ORM/TypeInfoORMService.ts`.
- [x] Confirm the exact parameter order for:
	- [x] `read`
	- [x] `list`
	- [x] `listRelatedItems` (or whatever name is used in this repo)
- [x] Write down for each:
	- required params
	- optional params
	- the runtime shape expected for `selectedFields` (array? object containing `valueFields`? etc.)

### Step 2: Patch `ORMRouteMap.ts`
- [x] In `src/api/ORM/ORMRouteMap.ts`, locate the factory/wrapper that currently does the equivalent of:
	- `(...args) => method(...args, context)`
- [x] Replace *only* the handlers for routes that map to methods above with wrappers that **pad `undefined`** for omitted `selectedFields`.

Concrete implementation approach (Codex should adapt to actual local names):
- [x] For `db/list` handler:
	- [x] If `args.length === 2` then call:
		- `service.list(args[0], args[1], undefined, context)`
	- [x] Else call:
		- `service.list(args[0], args[1], args[2], context)`
- [x] For `db/read` handler:
	- [x] If `args.length === 2` then call:
		- `service.read(args[0], args[1], undefined, context)`
	- [x] Else call:
		- `service.read(args[0], args[1], args[2], context)`
- [x] For `db/list-related-items` handler (or equivalent):
	- [x] If `args.length === 1` then call:
		- `service.listRelatedItems(args[0], undefined, context)`
	- [x] Else call:
		- `service.listRelatedItems(args[0], args[1], context)`

Constraints:
- [x] Do **not** change the non-DAC path.
- [x] Do **not** change other routes; keep the generic wrapper for signatures that are not ambiguous.
- [x] Do **not** “fix” validation to accept context-as-selectedFields; the routing layer is the correct place.

Acceptance for Phase 1:
- [x] A call with omitted selectedFields no longer shifts args.
- [x] The original failing call `["Person", {"itemsPerPage": 5}]` no longer throws.

---

## Phase 2 — Add regression coverage (prevents re-break)

### Unit-level route map test
- [x] Find the existing test harness for `ORMRouteMap`.
	- Likely files:
		- `src/api/ORM/ORMRouteMap.test-utils.ts`
		- `src/api/ORM/ORMRouteMap.spec.json`
		- any `*.spec.ts` or `*.test.ts` nearby

- [x] Add a dedicated test case: `db/list pads selectedFields when omitted under DAC wrapper`
	- [x] Arrange:
		- minimal TypeInfo for `Person` sufficient to pass validation for `list`
		- a minimal context object that triggers the DAC wrapper path (whatever the route map expects)
	- [x] Act:
		- call the route handler with exactly 2 args:
			- `("Person", { itemsPerPage: 5 })`
	- [x] Assert:
		- no throw
		- return shape matches the list contract (even if empty)

- [x] Add a parallel test case for `db/read` (omitted selectedFields)
	- [x] Call with 2 args `(typeName, id)`
	- [x] Assert: no throw *from validation/routing* (storage may be mocked)

- [x] Add a parallel test for `db/list-related-items` if that route exists in the map.

Acceptance for Phase 2:
- [x] Tests fail on the old wrapper, pass with the fix.

---

## Phase 3 — Validate in the demo deployment

- [ ] Rebuild + redeploy the demo site API cloud function.
- [ ] Load the demo UI route/page that triggers the Person list.
- [ ] Confirm CloudWatch no longer logs:
	- `LOGGING_FUNCTION_CALL ERROR "db"/"list" : TypeError: valueFields is not iterable`
- [ ] Confirm the UI shows a list response (even if empty) without failing.

Acceptance for Phase 3:
- [ ] No CloudWatch errors for `db/list` under normal demo usage.

---

## Notes / pitfalls
- This is an optional-arg + appended-context hazard.
- Keep the fix narrow: route wrapper only, only for ambiguous signatures.
- If the repo later adds more methods of the form `(..., selectedFields?, context?)`, they must follow the same padding rule.
