- Voltra Form System Feature Plan
  - Scope
    - Implement full support for TypeInfo/TypeInfoField tags, constraints, and permissions.
    - Keep form engine/controller logic separate from UI rendering.
    - Reference types: TypeInfo, TypeInfoField, SupportedTags, SupportedFieldTags in src/common/TypeParsing/TypeInfo.ts

  - Field Presence & Validation
    - [x] Optional field handling should not show required indicator or errors
    - [x] Readonly fields render as disabled inputs
    - [x] Default values from tags.constraints.defaultValue
    - [x] Pattern, min, max, step constraints surfaced in inputs

  - Field Rendering & Metadata
    - [x] Field label from tags.label
    - [x] Field format from tags.format mapped to input type
    - [x] Hidden fields omitted from AutoFormView
    - [x] Primary field display handling
    - [x] Custom type hooks for tags.customType

  - Relations & Arrays
    - [x] Relation fields delegate via onRelationAction
    - [x] Relational fields avoid storing relationship values on form data
    - [x] Array fields support add/remove with defaults
    - [x] Array of relations defers per item via onRelationAction
    - [x] Array of primitives uses inline controls

  - Type-Level Tags & Permissions
    - [x] Denied operations at type/field level disable create/update/delete paths
    - [x] Persisted/fullPaging tags exposed for consumer UI decisions

  - Controller & UI Extensions
    - [x] Expose controller metadata for UI (labels, required, disabled)
    - [x] Add tests for TypeInfo tag handling
    - [x] Document controller usage in demo/docs
    - [x] Showcase tags and handlers in demo form
    - [x] Use TypeInfoDataItem for form values
