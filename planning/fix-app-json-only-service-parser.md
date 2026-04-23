# JSON-only service parser

## Goals

- Make `sendServiceRequest` treat service responses as JSON-only.
- Remove string fallback wrapping so parsed values are returned directly.
- Set unparseable response bodies to `undefined` and update focused tests.

## Checklist

- [x] Update `src/app/utils/Service.ts` JSON parsing and return/throw behavior.
- [x] Update `src/app/utils/Service.test-utils.ts` and `src/app/utils/Service.spec.json` for JSON-only semantics.
- [x] Run focused specs covering service parsing behavior.
