# IaC resource patch DX fix

Goal: make `SimpleCFT.patch()` match its deep-merge behavior for CloudFormation resources without recursively exposing/expanding the full generated template type surface in public docs.

## Checklist

- [x] Preserve the curated IaC public/export boundary and avoid exposing generated CloudFormation types as a new public entrypoint.
- [x] Replace the broad `DeepPartial<CloudFormationTemplate>` public signature with a focused patch descriptor.
- [x] Preserve resource-type discrimination: when `Type` is supplied, `Properties` autocomplete and type-check against that exact CloudFormation resource type.
- [x] Allow patch fragments to omit normally-required resource fields and nested required properties.
- [x] Keep resource creation paths (`createResourcePack`) strict unless they intentionally use patch semantics.
- [x] Add type-level consumer coverage for typed resource patches, untyped resource fragments, invalid properties, and required-property omission.
- [x] Preserve runtime patch behavior and existing SimpleCFT fixture coverage.
- [x] Verify build/tests/consumer checks and TypeDoc/site generation no longer create oversized pages.
- [ ] Close the plan after PR review/merge.

## Verification

- `yarn test`: pass (952 core tests and 58 native tests, 0 failures/errors).
- `yarn build`: pass.
- `yarn test:exports`: pass.
- `yarn test:consumer`: pass against the packed package, including the new resource-patch type contract checks.
- One-time PR verification ran `yarn doc` and asserted both pages that exceeded GitHub's 100 MB limit after the broad deep-partial change were below 100,000,000 bytes; the checks passed.
- TypeDoc generation in that verification completed in about 12 seconds, versus the multi-minute expansion seen with `DeepPartial<CloudFormationTemplate>`.
