- Voltra Form System Tidy-Up
  - Scope
    - Fix hidden field support from TypeInfoField tags.
    - Resolve number input leading-zero padding behavior.
    - Audit remaining TypeInfo/TypeInfoField features for alignment in src/app/forms.

  - Hidden Fields
    - [x] Reproduce hidden tag not taking effect
    - [x] Trace tag extraction and ensure tags.hidden flows into TypeInfoField
    - [x] Ensure form controller/UI consistently hides hidden fields
    - [x] Add/adjust tests or demo coverage

  - Number Input Behavior
    - [x] Reproduce leading-zero padding issue
    - [x] Identify source of forced padding (input value/handler)
    - [x] Fix input handling to avoid forced leading zeros
    - [x] Add/adjust tests or demo coverage

  - Required Boolean Behavior
    - [x] Reproduce required boolean forcing checked state
    - [x] Ensure required boolean defaults to false when unset
    - [x] Add/adjust tests or demo coverage

  - Array Required/Optional Behavior
    - [x] Reproduce required string[] missing-item validation
    - [x] Reproduce optional string[] add-item failure
    - [x] Ensure required arrays validate for at least one item
    - [x] Ensure optional arrays allow adding items without defaulting values
    - [x] Add/adjust tests or demo coverage

  - TypeInfo/TypeInfoField Feature Audit
    - [x] Review SupportedTags and SupportedFieldTags for missing form behaviors
    - [x] Implement any missing support (or document deferrals)
    - [x] Update tests/docs/demo as needed
    - Notes: type-level tags are exposed via controller `typeTags` for consumers; relation/custom type handling is deferred to handlers by design.
    - Notes: forms values are flat with arrays of primitives only; no nested object values are expected.
