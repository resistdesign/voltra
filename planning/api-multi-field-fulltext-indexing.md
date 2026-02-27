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
