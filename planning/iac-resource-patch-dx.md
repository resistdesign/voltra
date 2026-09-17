# IaC resource patch DX fix

Goal: make `SimpleCFT.patch()` match its deep-merge behavior for CloudFormation resources without recursively exposing/expanding the full generated template type surface in public docs.

## Checklist

- [ ] Preserve the curated IaC public/export boundary and avoid exposing generated CloudFormation types as a new public entrypoint.
- [ ] Replace the broad `DeepPartial<CloudFormationTemplate>` public signature with a focused patch descriptor.
- [ ] Preserve resource-type discrimination: when `Type` is supplied, `Properties` should autocomplete and type-check against that exact CloudFormation resource type.
- [ ] Allow patch fragments to omit normally-required resource fields and nested required properties.
- [ ] Keep resource creation paths (`createResourcePack`) strict unless they intentionally use patch semantics.
- [ ] Add type-level consumer coverage for typed resource patches, untyped resource fragments, invalid properties, and required-property omission.
- [ ] Preserve runtime patch behavior and existing SimpleCFT fixture coverage.
- [ ] Verify build/tests/consumer checks and TypeDoc/site generation no longer create oversized pages.
- [ ] Close the plan when verification is complete.
