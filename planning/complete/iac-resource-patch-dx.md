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
- [x] Export the named patch contract visible in public function signatures from `@resistdesign/voltra/iac`.
- [x] Verify a packed-package consumer can explicitly import and comply with `CloudFormationTemplatePatch`.
- [x] Re-run PR verification after the public export change.
- [x] Move this plan to `planning/complete/` before the PR is considered merge-ready.

## Verification

- `yarn test`: pass (952 core tests and 58 native tests, 0 failures/errors).
- `yarn build`: pass.
- `yarn test:exports`: pass.
- `yarn test:consumer`: pass against the packed package, including direct import/use of `CloudFormationTemplatePatch` plus the resource-patch type contract checks.
- GitHub Actions run 207 re-ran the full test/build/export/consumer sequence after the public type export and passed.
- Run 207 also generated TypeDoc and checked the entire generated docs tree for files at or above GitHub's 100 MB deployment limit; no oversized pages were produced.
- The docs-size verification step was intentionally one-time and removed again after passing so normal PR CI keeps the existing lightweight build/test contract.
