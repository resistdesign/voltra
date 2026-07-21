# Fix DynamoDB `IN` Operator

## Goal

Make DynamoDB-backed ORM lists expand `IN` candidates into valid, collision-safe expression placeholders, prove the behavior at the driver boundary, and demonstrate the operator naturally in the End To End demo.

## Checklist

- [x] Confirm the supplied source matches the relevant files on GitHub `main` and locate the End To End demo.
- [x] Implement `valueOptions`-first candidate resolution with array-valued `value` compatibility.
- [x] Generate one stable placeholder per candidate and reject empty or missing candidates before command dispatch.
- [x] Extend the DynamoDB mock evaluator and add focused VEST scenarios for expressions, values, results, compatibility, validation, and composition.
- [x] Add a clear, functional `IN` use to the End To End demo and update its supporting documentation where appropriate.
- [x] Run `yarn test:core` and `yarn build`; inspect the final diff for scope and quality.
- [x] Publish `fix/dynamodb-in-operator` and open a draft PR with validation evidence.
