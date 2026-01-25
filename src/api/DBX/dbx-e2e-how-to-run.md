# DBX E2E Tests: How to Run

## Quick Start

Run the default DBX suite (SMALL dataset + all DBX specs except the MED scale spec):

```bash
yarn test "./src/api/DBX/DBX_*.spec.json"
```

> Note: `yarn test` already runs the full spec suite and excludes the MED scale spec.

## Run Only DBX Tests

```bash
yarn test "./src/api/DBX/DBX_*.spec.json"
```

## Run the MED Scale Scenario

The MED scale spec is intentionally excluded from default `yarn test` runs.

```bash
yarn test:dbx:med
```

## Regenerate DBX Expectations

Re-generate expectations for the DBX suite (SMALL dataset):

```bash
yarn test:gen "./src/api/DBX/DBX_*.spec.json"
```

Re-generate expectations for the MED scale spec:

```bash
yarn test:dbx:med:gen
```

## Notes

- DBX specs live in `src/api/DBX` and follow the `DBX_*.spec.json` naming convention.
- The MED scale spec is defined in `src/api/DBX/DBX_SCALE_E2E_MED.spec.json`.
