# Voltra Demo Site – End‑to‑End Demo Execution Plan (Codex)

## 0. Purpose (Non‑Negotiable)

This demo is **both proof and reference**.

It must demonstrate, using **real Voltra APIs and primitives only**, that the system correctly supports:

* CRUD
* List + cursor pagination
* Full‑text search (lossy + exact)
* Structured search
* First‑class relationship records

All of this must occur in **one cohesive UI flow**, not as isolated demos.

No demo‑only shortcuts, fake data paths, or internal API reach‑ins are allowed.

---

## 1. Golden Path (Must Be Preserved)

The demo’s core narrative is:

1. Create a **Person**
2. View Person details
3. Manage the Person’s `car` relationship
4. Search for Cars (lossy + exact + structured + cursor paging)
5. Select an existing Car **or** create a new Car
6. Establish the relationship (backend enforces ONE)
7. Return to Person details
8. Edit the related Car via its real form
9. Optionally replace or remove the Car relationship (with confirmation)

If this flow is broken, obscured, or bypassed, the demo fails.

---

## 2. Data Model Assumptions (Already True — Do Not Reinterpret)

* `Person` has a **single** relationship field: `car: Car`
* This is **not** an array
* Cardinality is enforced by **TypeInfoORMService**, not the UI
* Relationships are stored as **first‑class relationship records**, not foreign keys

The UI must rely on backend semantics — no UI‑level enforcement hacks.

---

## 3. Relationship Semantics (Locked)

### Creation

* A Person **must exist** before a Car relationship can be created
* No atomic multi‑entity creation
* UI orchestrates multiple normal API calls

### Replacement

* If a Person already has a Car and a new Car is selected:

  * UI **must show a confirmation step**
  * On confirm, perform a normal relationship “set”
  * Backend replaces existing relationship (ONE semantics)

### Removal

* Removing a Car relationship **requires confirmation**
* After removal:

  * `Person.car` may be empty
  * This is a valid persisted state

No relationship validation beyond this is allowed.

---

## 4. Search Requirements (Must Be Used in Real Flow)

Search is not a separate demo page.

During **Car selection**, the UI must expose:

* Lossy full‑text search
* Exact full‑text search
* Structured filters
* Cursor‑based pagination

The relationship workflow itself must exercise indexing.

---

## 5. CRUD Coverage (Explicit)

The demo must visibly and verifiably perform:

* Create Person

* Read Person (details view)

* Update Person

* Delete Person

* Create Car

* Read Car

* Update Car

* Delete Car

No operation may be simulated or skipped.

---

## 6. API Usage Rules (Critical)

* Use **only** public Voltra APIs
* Use the same packages and routes a real consumer would
* No direct access to internal services unless already exposed
* No demo‑specific endpoints

The demo should double as a reference implementation.

---

## 7. Request / Response Transparency

The UI must make it possible to inspect:

* Real request payloads
* Real responses
* Errors when they occur

This may be via expandable panels, logs, or debug sections.

Hidden magic is not acceptable.

---

## 8. Styling & UI Constraints (Production‑Adjacent)

Styling rules:

* **Pico CSS is the default**
* Assume Pico already solves the problem
* Add styling **only** when layout truly requires it

Allowed styling additions:

* Minimal styled‑components
* Layout‑only properties:

  * grid / flex
  * spacing
  * sizing
  * responsiveness

Disallowed:

* New design systems
* Color, typography, shadow, animation tweaks
* Visual polish for its own sake

Plain and correct beats fancy.

---

## 9. Explicit Non‑Goals (Do Not Add)

* ❌ Atomic multi‑entity create APIs
* ❌ Relationship validation systems
* ❌ “Use Person” or domain‑level validation flows
* ❌ Demo‑only shortcuts
* ❌ Hardcoded glue logic
* ❌ Excessive styling

These belong to future phases.

---

## 10. Acceptance Criteria (Release Gate)

The demo is acceptable only if:

* The full golden path works end‑to‑end in prod
* CRUD, search, and relationships are all exercised
* Relationship cardinality is enforced by backend
* Search is used *inside* relationship management
* UI remains Pico‑first and minimal
* Code reads as a reference implementation

If any of these fail, the demo is incomplete.

---

## 11. Codex Execution Guidance

When in doubt:

1. Re‑read Section 0 and Section 1
2. Prefer correctness over polish
3. Prefer backend semantics over UI tricks
4. Prefer boring code over clever code

This demo exists to **prove Voltra’s intent**, not to impress with UI flair.

---

## Execution Checklist

- [x] Add end-to-end demo route and navigation entry
- [x] Wire ORM client config plus request/response logging panel
- [x] Implement Person CRUD flow with list + detail view
- [x] Implement Car search (lossy/exact/structured) with cursor paging
- [x] Implement relationship set/replace/remove flow with confirmations
- [x] Implement Car CRUD flow for related car (read/update/delete)
