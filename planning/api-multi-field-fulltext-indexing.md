# API: Multi-Field Fulltext Indexing

## Overview

Right now, when using the `fulltext` indexing in the `TypeInfoORMService`, you can only designate one field as being
fulltext indexed. You can see that in the configuration for `TypeInfoORMIndexingConfig` -> `fullText` ->
`defaultIndexFieldByType`. `defaultIndexFieldByType` is just a map from TypeInfo Type Name to a *Single* Field Name.

What we *really* need is for the fulltext indexing system to be able to index multiple fields per type and for the shape
of `defaultIndexFieldByType` to be updated accordingly.

## Considerations:

1. We need to be able to configure multiple fields, on each designated type, to be fulltext indexed.
2. We need the system to do the indexing for these fields.
3. We need the system to be able to do the fulltext search on these fields, by field, as specified for search.
4. We need methods/functions like `TypeInfoORMService` `list` to facilitate these fulltext searches on multiple fields.
5. So far everything is setup for single field fulltext indexing and searching, so that's fine, but everything will need
   to be refactored to support multi-field fulltext indexing and search.

## Be Thorough

We want to deeply examine the project around this fulltext indexing and search features.

Understand things like what the front-end needs in order to use this feature.

Understand how it will be configured while being clear to consumers about how it works and what behavior to expect.

## Follow Through

We will want to make sure that the following types of assets are updated around this refactor:

1. Documentation
2. Doc Comments
3. READMEs
4. Tests
5. Demo Site, app and api
6. Samples/Examples
7. Any other related assets

## Supported Search Criteria Operator Checklist

Follow the list below to determine how fulltext search should be implemented for each operator:

1. [ ] EQUALS: NOT A FULLTEXT OPERATOR
      - NOTES: ...
2. [ ] NOT_EQUALS: NOT A FULLTEXT OPERATOR
      - NOTES: ...
3. [ ] GREATER_THAN: NOT A FULLTEXT OPERATOR
      - NOTES: ...
4. [ ] GREATER_THAN_OR_EQUAL: NOT A FULLTEXT OPERATOR
      - NOTES: ...
5. [ ] LESS_THAN: NOT A FULLTEXT OPERATOR
      - NOTES: ...
6. [ ] LESS_THAN_OR_EQUAL: NOT A FULLTEXT OPERATOR
      - NOTES: ...
7. [ ] IN: NOT A FULLTEXT OPERATOR
      - NOTES: ...
8. [ ] NOT_IN: NOT A FULLTEXT OPERATOR
      - NOTES: ...
9. [ ] LIKE: YES, USE FULLTEXT TO SEARCH
      - NOTES: ...
10. [ ] NOT_LIKE: YES, USE FULLTEXT TO SEARCH
      - NOTES: ...
11. [ ] EXISTS: NOT A FULLTEXT OPERATOR
      - NOTES: ...
12. [ ] NOT_EXISTS: NOT A FULLTEXT OPERATOR
      - NOTES: ...
13. [ ] IS_NOT_EMPTY: NOT A FULLTEXT OPERATOR
      - NOTES: ...
14. [ ] IS_EMPTY: NOT A FULLTEXT OPERATOR
      - NOTES: ...
15. [ ] BETWEEN: NOT A FULLTEXT OPERATOR
      - NOTES: ...
16. [ ] NOT_BETWEEN: NOT A FULLTEXT OPERATOR
      - NOTES: ...
17. [ ] CONTAINS: YES, USE FULLTEXT TO SEARCH
      - NOTES: ...
18. [ ] NOT_CONTAINS: YES, USE FULLTEXT TO SEARCH
      - NOTES: ...
19. [ ] STARTS_WITH: YES, USE FULLTEXT TO SEARCH
      - NOTES: ...
20. [ ] ENDS_WITH: YES, USE FULLTEXT TO SEARCH
      - NOTES: ...
21. [ ] DOES_NOT_START_WITH: YES, USE FULLTEXT TO SEARCH
      - NOTES: ...
22. [ ] DOES_NOT_END_WITH: YES, USE FULLTEXT TO SEARCH
      - NOTES: ...

## Checklist

- [x] Phase 1: Core multi-field fulltext support
  - [x] Refactor indexing config/types to support multiple fulltext fields per type.
  - [x] Update indexing write paths to emit fulltext entries for all configured fields.
  - [x] Update read/query paths to support field-targeted fulltext search across configured fields.
  - [x] Update `TypeInfoORMService` list/search interfaces as needed for multi-field fulltext queries.
  - [x] Add/update JSON spec tests covering multi-field indexing and search behavior.
- [x] Phase 2: Consumer-facing assets
  - [x] Update doc comments for changed public types/functions.
  - [x] Update relevant docs/README/examples and demo usage for multi-field fulltext.
  - [x] Verify exports/entrypoints remain aligned.
- [x] Phase 3: Verification
  - [x] Run targeted tests and full relevant test command(s).
  - [x] Address failures and finalize checklist status.
- [x] Phase 4: Auto-fulltext search behavior in `list`
  - [x] Remove direct fulltext argument usage from `list` config and related request paths.
  - [x] Require field-targeted fulltext behavior via structured search criteria only.
  - [x] Implement auto-selection of fulltext backend when criteria fields are fulltext-indexed and operators imply
    fulltext search semantics.
  - [x] Keep non-fulltext-compatible operators/fields on structured or driver paths with explicit validation/error
    behavior where needed.
  - [x] Add/update JSON specs covering required field targeting, automatic fulltext routing, and unsupported
    combinations.
- [x] Phase 5: Demo Site multi-field fulltext demonstration
  - [x] Update demo API indexing config to clearly demonstrate multi-field fulltext indexing for one or more types.
  - [x] Update demo app search flows to exercise the new auto-fulltext criteria-based behavior.
  - [x] Add/adjust demo-facing tests or scenario coverage to verify behavior end-to-end.
  - [x] Ensure demo source clearly shows the implementation pattern for others to follow.
