# TypeInfo Compatible Literal + Primitive Unions

## Goal

Preserve literal metadata when a TypeScript union also includes the matching broad primitive, while retaining Voltra's existing strict behavior for pure literal unions and applying normal constraints to broad values.

## Checklist

- [ ] Parse homogeneous literal + matching primitive unions for string, number, and boolean without dropping literals or incompatible union members.
- [ ] Preserve mixed-union semantics in TypeInfo so `possibleValues` can remain strict for pure literal unions but non-exhaustive for unions containing the broad primitive.
- [ ] Preserve the same metadata through parenthesized and array types, and validate every array element with the normal primitive/constraint path.
- [ ] Make a non-empty string pattern authoritative over `possibleValues`, including malformed-pattern failure behavior.
- [ ] Add parser and validation coverage for scalar, array, compatible, incompatible, and strict-enum cases.
- [ ] Verify the PR with the repository test/build/export workflow.
