- Voltra Form System Tidy-Up
  - Scope
    - Fix hidden field support from TypeInfoField tags.
    - Resolve number input leading-zero padding behavior.
    - Audit remaining TypeInfo/TypeInfoField features for alignment in src/app/forms.

  - Hidden Fields
    - [~] Reproduce hidden tag not taking effect
    - [x] Trace tag extraction and ensure tags.hidden flows into TypeInfoField
    - [x] Ensure form controller/UI consistently hides hidden fields
    - [ ] Add/adjust tests or demo coverage

  - Number Input Behavior
    - [~] Reproduce leading-zero padding issue
    - [x] Identify source of forced padding (input value/handler)
    - [x] Fix input handling to avoid forced leading zeros
    - [ ] Add/adjust tests or demo coverage

  - TypeInfo/TypeInfoField Feature Audit
    - [x] Review SupportedTags and SupportedFieldTags for missing form behaviors
    - [x] Implement any missing support (or document deferrals)
    - [ ] Update tests/docs/demo as needed
    - Notes: type-level tags are exposed via controller `typeTags` for consumers; relation/custom type handling is deferred to handlers by design.
