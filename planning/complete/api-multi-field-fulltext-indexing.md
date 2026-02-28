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

Re-run and verify each asset category after the refactor/feature work:

- [x] Documentation
  - Verified `TypeInfoORM` behavior contract reflects auto-fulltext, structured, and fallback routing.
  - Updated: `src/api/ORM/INDEXING_INTEGRATION.md`
- [x] Doc Comments
  - Verified public typing/docs reflect multi-field fulltext config (`Record<string, string | string[]>`) and criteria-driven list behavior.
  - Verified by: `yarn doc`
- [x] READMEs
  - Updated demo README notes to explicitly describe quick-query fulltext vs structural behavior.
  - Updated: `site/app/src/client/EndToEndDemo.README.md`
- [x] Tests
  - Operator coverage suite exists and validates fulltext, structural/indexed, and full-scan+compare fallback behavior.
  - Coverage source: `src/api/ORM/TypeInfoORMService.operatorCoverage.spec.json`
- [x] Demo Site, app and api
  - Demo API config uses multi-field fulltext indexing by type.
  - Demo app search flow uses criteria-based routing with field selection and operators.
  - Verified in: `site/api/routeMap.ts`, `site/app/src/client/EndToEndDemo.tsx`, `site/app/src/client/EndToEndDemo/screens/CarRelateScreen.tsx`
- [x] Samples/Examples
  - Added explicit pointers to the demo and ORM integration docs as the reference implementation pattern.
  - Updated: `examples/README.md`
- [x] Any other related assets
  - Operator checklist notes reflect implementability and fallback intent per operator.

## Supported Search Criteria Operator Checklist

Follow the list below to determine how fulltext search should be implemented for each operator:

- [x] EQUALS: NOT A FULLTEXT OPERATOR
  - NOTES: Implemented as structural equality. Fulltext intentionally not used because `EQUALS` means whole-value exact
    equality.
  - CAN BE IMPLEMENTED AS INTENDED (Yes or No): Yes
  - ALTERNATE PLAN (Full Scan and Compare or Other): Keep structural indexed search path; fallback to driver scan+compare when structured backend is unavailable.
- [x] NOT_EQUALS: NOT A FULLTEXT OPERATOR
  - NOTES: Comparator exists, but indexed criteria path does not currently map this operator.
  - CAN BE IMPLEMENTED AS INTENDED (Yes or No): Yes
  - ALTERNATE PLAN (Full Scan and Compare or Other): Implement structured mapping, or fallback to driver scan+compare (`SearchUtils`) until indexed support is added.
- [x] GREATER_THAN: NOT A FULLTEXT OPERATOR
  - NOTES: Comparator exists, but indexed criteria path does not currently map this operator.
  - CAN BE IMPLEMENTED AS INTENDED (Yes or No): Yes
  - ALTERNATE PLAN (Full Scan and Compare or Other): Add structured mapping for `GT`; until then use driver scan+compare.
- [x] GREATER_THAN_OR_EQUAL: NOT A FULLTEXT OPERATOR
  - NOTES: Implemented in structured indexed search.
  - CAN BE IMPLEMENTED AS INTENDED (Yes or No): Yes
  - ALTERNATE PLAN (Full Scan and Compare or Other): Current structured indexed path is primary; fallback scan+compare remains possible.
- [x] LESS_THAN: NOT A FULLTEXT OPERATOR
  - NOTES: Comparator exists, but indexed criteria path does not currently map this operator.
  - CAN BE IMPLEMENTED AS INTENDED (Yes or No): Yes
  - ALTERNATE PLAN (Full Scan and Compare or Other): Add structured mapping for `LT`; until then use driver scan+compare.
- [x] LESS_THAN_OR_EQUAL: NOT A FULLTEXT OPERATOR
  - NOTES: Implemented in structured indexed search.
  - CAN BE IMPLEMENTED AS INTENDED (Yes or No): Yes
  - ALTERNATE PLAN (Full Scan and Compare or Other): Current structured indexed path is primary; fallback scan+compare remains possible.
- [x] IN: NOT A FULLTEXT OPERATOR
  - NOTES: Implemented in structured indexed search.
  - CAN BE IMPLEMENTED AS INTENDED (Yes or No): Yes
  - ALTERNATE PLAN (Full Scan and Compare or Other): Current structured indexed path is primary; fallback scan+compare remains possible.
- [x] NOT_IN: NOT A FULLTEXT OPERATOR
  - NOTES: Comparator exists, but indexed criteria path does not currently map this operator.
  - CAN BE IMPLEMENTED AS INTENDED (Yes or No): Yes
  - ALTERNATE PLAN (Full Scan and Compare or Other): Add structured mapping or use driver scan+compare as interim path.
- [x] LIKE: YES, USE FULLTEXT TO SEARCH
  - NOTES: Implemented for fulltext-indexed fields (auto-routes to lossy fulltext search).
  - CAN BE IMPLEMENTED AS INTENDED (Yes or No): Yes
  - ALTERNATE PLAN (Full Scan and Compare or Other): Existing auto-fulltext path is primary; fallback scan+compare can emulate behavior when indexing is off.
- [x] NOT_LIKE: YES, USE FULLTEXT TO SEARCH
  - NOTES: Not implemented in fulltext path; requires negation/complement-set behavior not currently available.
  - CAN BE IMPLEMENTED AS INTENDED (Yes or No): No
  - ALTERNATE PLAN (Full Scan and Compare or Other): Use full scan+compare for now; true indexed support requires complement-set/anti-join semantics over fulltext results.
- [x] EXISTS: NOT A FULLTEXT OPERATOR
  - NOTES: Comparator exists, but indexed criteria path does not currently map this operator.
  - CAN BE IMPLEMENTED AS INTENDED (Yes or No): Yes
  - ALTERNATE PLAN (Full Scan and Compare or Other): Add structured mapping for attribute existence, or fallback to driver scan+compare.
- [x] NOT_EXISTS: NOT A FULLTEXT OPERATOR
  - NOTES: Comparator exists, but indexed criteria path does not currently map this operator.
  - CAN BE IMPLEMENTED AS INTENDED (Yes or No): Yes
  - ALTERNATE PLAN (Full Scan and Compare or Other): Add structured mapping for missing/null checks, or fallback to driver scan+compare.
- [x] IS_NOT_EMPTY: NOT A FULLTEXT OPERATOR
  - NOTES: Comparator exists, but indexed criteria path does not currently map this operator.
  - CAN BE IMPLEMENTED AS INTENDED (Yes or No): Yes
  - ALTERNATE PLAN (Full Scan and Compare or Other): Add structured mapping, or fallback to driver scan+compare.
- [x] IS_EMPTY: NOT A FULLTEXT OPERATOR
  - NOTES: Comparator exists, but indexed criteria path does not currently map this operator.
  - CAN BE IMPLEMENTED AS INTENDED (Yes or No): Yes
  - ALTERNATE PLAN (Full Scan and Compare or Other): Add structured mapping, or fallback to driver scan+compare.
- [x] BETWEEN: NOT A FULLTEXT OPERATOR
  - NOTES: Implemented in structured indexed search.
  - CAN BE IMPLEMENTED AS INTENDED (Yes or No): Yes
  - ALTERNATE PLAN (Full Scan and Compare or Other): Current structured indexed path is primary; fallback scan+compare remains possible.
- [x] NOT_BETWEEN: NOT A FULLTEXT OPERATOR
  - NOTES: Comparator exists, but indexed criteria path does not currently map this operator.
  - CAN BE IMPLEMENTED AS INTENDED (Yes or No): Yes
  - ALTERNATE PLAN (Full Scan and Compare or Other): Add structured mapping or use driver scan+compare as interim path.
- [x] CONTAINS: YES, USE FULLTEXT TO SEARCH
  - NOTES: Implemented for fulltext-indexed string fields (auto-routes to exact/phrase fulltext search).
  - CAN BE IMPLEMENTED AS INTENDED (Yes or No): Yes
  - ALTERNATE PLAN (Full Scan and Compare or Other): For arrays/non-fulltext fields, route to structural contains or fallback scan+compare.
- [x] NOT_CONTAINS: YES, USE FULLTEXT TO SEARCH
  - NOTES: Not implemented in fulltext path; negated fulltext semantics are not currently supported.
  - CAN BE IMPLEMENTED AS INTENDED (Yes or No): No
  - ALTERNATE PLAN (Full Scan and Compare or Other): Use full scan+compare for now; indexed support needs complement-set semantics.
- [x] STARTS_WITH: YES, USE FULLTEXT TO SEARCH
  - NOTES: Implemented for fulltext-indexed fields (auto-routes to lossy prefix fulltext search).
  - CAN BE IMPLEMENTED AS INTENDED (Yes or No): Yes
  - ALTERNATE PLAN (Full Scan and Compare or Other): Existing auto-fulltext path is primary; fallback scan+compare can emulate behavior when indexing is off.
- [x] ENDS_WITH: YES, USE FULLTEXT TO SEARCH
  - NOTES: Not implemented in fulltext path; would require suffix-oriented index/query support.
  - CAN BE IMPLEMENTED AS INTENDED (Yes or No): No
  - ALTERNATE PLAN (Full Scan and Compare or Other): Use full scan+compare for now; indexed fulltext support needs suffix index or reverse-token strategy.
- [x] DOES_NOT_START_WITH: YES, USE FULLTEXT TO SEARCH
  - NOTES: Not implemented in fulltext path; requires negation/complement-set behavior.
  - CAN BE IMPLEMENTED AS INTENDED (Yes or No): No
  - ALTERNATE PLAN (Full Scan and Compare or Other): Use full scan+compare for now; indexed support requires anti-join/complement-set semantics.
- [x] DOES_NOT_END_WITH: YES, USE FULLTEXT TO SEARCH
  - NOTES: Not implemented in fulltext path; requires suffix + negation support.
  - CAN BE IMPLEMENTED AS INTENDED (Yes or No): No
  - ALTERNATE PLAN (Full Scan and Compare or Other): Use full scan+compare for now; indexed support requires suffix index plus complement-set semantics.

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
