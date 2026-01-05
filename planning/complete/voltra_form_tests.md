- Voltra Form System Test Plan (TypeInfo Coverage)
  - Scope
    - Add tests for form engine + UI behavior driven by `TypeInfo` and sub-types.
    - Each checklist item below maps 1:1 to a single property or tag in `TypeInfo`/sub-types.
    - Target locations: `src/app/forms/Engine.ts`, `src/app/forms/UI.tsx`, `src/app/forms/types.ts`,
      `src/app/forms/utils.ts`.
    - Test harness: JSON spec runner using `src/**/*.spec.json` and `src/**/Engine.test-utils.ts` style helpers.
    - Known assumptions: form values are flat (`TypeInfoDataItem`), arrays are primitives only, relations/custom types
      defer to handlers.
    - Demo reference: `site/app/src/client/AdvancedDemo.tsx` reflects current behaviors but is not the test target.
    - Validation rules: required checks skip hidden fields; readonly fields skip required validation when empty; empty
      arrays are missing for required.
    - Recent refactor history (for test context):
      - `TypeInfo`/`TypeInfoField` are the single source of truth; legacy metadata types were removed.
      - Form engine uses `TypeInfoDataItem` values; no nested objects, deepest value is array of primitives.
      - Relations (`typeReference`) do not bind values; the UI only triggers handler actions (button-only).
      - Custom types (`tags.customType`) also defer to handlers; arrays of custom types use add/edit/remove actions.
      - Hidden tags can appear nested; `normalizeFieldTags` merges nested `tags` and `tags.tags`.
      - Required boolean defaults to `false` when missing; number inputs treat empty as `null`.
      - Required arrays validate on length > 0; optional arrays should not be defaulted until first add.
      - Readonly required fields should not block submit if empty.
      - Number input leading-zero padding was fixed by parsing from raw string.

  - TypeInfo
    - [x] primaryField: primary field disables on update and shows primary flag
    - [x] fields: field map drives controller list order and key mapping
    - [x] unionFieldSets: controller preserves field list when union sets present

  - TypeInfoField
    - [x] type: renders correct primitive input for string
    - [x] type: renders correct primitive input for number
    - [x] type: renders correct primitive input for boolean
    - [x] typeReference: renders relation control (single)
    - [x] typeReference: renders relation control (array)
    - [x] array: renders repeatable array UI for primitives
    - [x] readonly: disables input and skips required validation when empty
    - [x] optional: required validation toggled off when true
    - [x] possibleValues: renders select for string values
    - [x] possibleValues: renders select for number values
    - [x] possibleValues: boolean/null values ignored in select options
    - [x] tags: normalized tags map from parser to form UI

  - SupportedFieldTags
    - [x] primaryField: marks controller field as primary (and disables on update)
    - [x] label: label overrides default field key
    - [x] format: uses correct input `type` for string
    - [x] allowCustomSelection: datalist input when possibleValues present
    - [x] customType: defers to custom type handler for scalar
    - [x] customType: defers to custom type handler for arrays
    - [x] hidden: field omitted from AutoFormView
    - [x] fullPaging: passed through to relation handler payload
    - [x] constraints.defaultValue: applied for missing initial values
    - [x] constraints.step: number input step attribute
    - [x] constraints.min: number input min attribute
    - [x] constraints.max: number input max attribute
    - [x] constraints.pattern: string input pattern attribute
    - [x] constraints.pattern: string input validation error on submit
    - [x] deniedOperations.CREATE: disables field on create
    - [x] deniedOperations.READ: disables field on read
    - [x] deniedOperations.UPDATE: disables field on update
    - [x] deniedOperations.DELETE: disables field on delete

  - SupportedTags (Type-Level)
    - [x] label: exposed for type-level consumers
    - [x] deniedOperations.CREATE: disables all fields on create
    - [x] deniedOperations.READ: disables all fields on read
    - [x] deniedOperations.UPDATE: disables all fields on update
    - [x] deniedOperations.DELETE: disables all fields on delete
    - [x] fullPaging: exposed for type-level consumers
    - [x] persisted: exposed for type-level consumers

  - TypeInfoPack
    - [x] entryTypeName: form system resolves correct entry type for rendering
    - [x] typeInfoMap: form system uses map to look up entry type

  - LiteralValue
    - [x] string: accepts + submits string inputs
    - [x] number: accepts + submits number inputs
    - [x] boolean: accepts + submits boolean inputs
    - [x] null: supports nullable values without validation errors

  - TypeInfoDataItem
    - [x] supports scalar values per field
    - [x] supports array values for primitive arrays
