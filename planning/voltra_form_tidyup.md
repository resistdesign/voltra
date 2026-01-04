- Voltra Form System Tidy-Up
  - Scope
    - Fix hidden field support from TypeInfoField tags.
    - Resolve number input leading-zero padding behavior.
    - Audit remaining TypeInfo/TypeInfoField features for alignment in src/app/forms.

  - Hidden Fields
    - [ ] Reproduce hidden tag not taking effect
    - [ ] Trace tag extraction and ensure tags.hidden flows into TypeInfoField
    - [ ] Ensure form controller/UI consistently hides hidden fields
    - [ ] Add/adjust tests or demo coverage

  - Number Input Behavior
    - [ ] Reproduce leading-zero padding issue
    - [ ] Identify source of forced padding (input value/handler)
    - [ ] Fix input handling to avoid forced leading zeros
    - [ ] Add/adjust tests or demo coverage

  - TypeInfo/TypeInfoField Feature Audit
    - [ ] Review SupportedTags and SupportedFieldTags for missing form behaviors
    - [ ] Implement any missing support (or document deferrals)
    - [ ] Update tests/docs/demo as needed
