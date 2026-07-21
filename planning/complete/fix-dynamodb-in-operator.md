# Fix DynamoDB `IN` Operator

## Goal

Make DynamoDB-backed ORM lists expand `IN` candidates into valid, collision-safe expression placeholders, prove the behavior at the driver boundary, and demonstrate the operator naturally in the End To End demo.

## Checklist

- [x] Confirm the supplied source matches the relevant files on GitHub `main` and locate the End To End demo.
- [x] Implement canonical `valueOptions` candidate resolution.
- [x] Generate one stable placeholder per candidate and reject empty or missing candidates before command dispatch.
- [x] Extend the DynamoDB mock evaluator and add focused VEST scenarios for expressions, values, results, validation, and composition.
- [x] Add a clear, functional `IN` use to the End To End demo and update its supporting documentation where appropriate.
- [x] Run `yarn test:core` and `yarn build`; inspect the final diff for scope and quality.
- [x] Publish `fix/dynamodb-in-operator` and open a draft PR with validation evidence.

## Type Contract Follow-up

- [x] Replace the permissive `FieldCriterion` property bag with operator-discriminated variants.
- [x] Require `valueOptions` for `IN` / `NOT_IN`, require a two-item tuple for range operators, and forbid operands for valueless operators.
- [x] Preserve an explicit permissive variant for custom operators without weakening standard operator checks.
- [x] Add compile-time contract assertions for valid and invalid operand shapes.
- [x] Remove array-valued `value` compatibility from the DynamoDB driver and its tests.
- [x] Run the core, package, consumer/export, and docs-site checks; inspect the final diff.
- [x] Publish the follow-up changes to PR #386 and update its validation evidence.
