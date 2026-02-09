# Fixing Cloud Function Reference Error in Site Demo

There is an error in the CloudWatch logs for the site demo API cloud function:

```json
[
  {
    "eventTime": 1770611280783,
    "message": "2026-02-09T04:28:00.783Z\tundefined\tERROR\tUncaught Exception \t{\"errorType\":\"ReferenceError\",\"errorMessage\":\"__filename is not defined in ES module scope\\nThis file is being treated as an ES module because it has a '.js' file extension and '/var/task/package.json' contains \\\"type\\\": \\\"module\\\". To treat it as a CommonJS script, rename it to use the '.cjs' file extension.\",\"stack\":[\"ReferenceError: __filename is not defined in ES module scope\",\"This file is being treated as an ES module because it has a '.js' file extension and '/var/task/package.json' contains \\\"type\\\": \\\"module\\\". To treat it as a CommonJS script, rename it to use the '.cjs' file extension.\",\"    at isFileSystemCaseSensitive (/node_modules/typescript/lib/typescript.js:8487:35)\",\"    at getNodeSystem (/node_modules/typescript/lib/typescript.js:8280:40)\",\"    at <anonymous> (/node_modules/typescript/lib/typescript.js:8665:12)\",\"    at <anonymous> (/node_modules/typescript/lib/typescript.js:8671:1)\",\"    at node_modules/typescript/lib/typescript.js (/node_modules/typescript/lib/typescript.js:200275:1)\",\"    at __require2 (file:///var/task/index.js:19:50)\",\"    at <anonymous> (/src/common/TypeParsing/TypeMapping.ts:9:8)\",\"    at ModuleJob.run (node:internal/modules/esm/module_job:325:25)\",\"    at async ModuleLoader.import (node:internal/modules/esm/loader:606:24)\",\"    at async _tryAwaitImport (file:///var/runtime/index.mjs:1098:16)\"]}\n"
  },
  {
    "eventTime": 1770611280808,
    "message": "INIT_REPORT Init Duration: 998.15 ms\tPhase: invoke\tStatus: error\tError Type: Runtime.Unknown\n"
  },
  {
    "eventTime": 1770611280808,
    "message": "START RequestId: 59c29f07-00fb-45f2-ba67-68ce90d6ed3b Version: $LATEST\n"
  },
  {
    "eventTime": 1770611280812,
    "message": "END RequestId: 59c29f07-00fb-45f2-ba67-68ce90d6ed3b\n"
  },
  {
    "eventTime": 1770611280812,
    "message": "REPORT RequestId: 59c29f07-00fb-45f2-ba67-68ce90d6ed3b\tDuration: 1012.45 ms\tBilled Duration: 1013 ms\tMemory Size: 512 MB\tMax Memory Used: 314 MB\tStatus: error\tError Type: Runtime.Unknown\n"
  }
]
```

## CAUSE INFO:

`src/common/TypeParsing/TypeParsing.ts` and `src/common/TypeParsing/TypeMapping.js` import `typescript` and therefore
`src/common` exports `typescript` and will cause it to be included in a bundle.

## SOLUTION:

- [x] Move `TypeParsing` and `TypeMapping` (plus their spec and test-utils files) from `src/common/TypeParsing` into `src/build`.
- [x] Export parser utilities only from `src/build/index.ts` and stop exporting `TypeMapping` from `src/common/TypeParsing/index.ts`.
- [x] Update impacted imports/usages:
  - [x] `src/common/TypeParsing/ParsingUtils/*` imports of `TypeMap` now use `import type` from `src/build/TypeMapping`.
  - [x] `src/common/TypeParsing/ParsingUtils/ParsingUtils.test-utils.ts` now imports `convertASTToMap` from `src/build/TypeMapping`.
  - [x] `scripts/prebuild-api-orm-driver-config-types.ts` now imports `getTypeInfoMapFromTypeScript` from `src/build`.
- [x] Evaluate `site/build-api.mjs`:
  - [x] Confirmed the API bundle no longer references `typescript/lib/typescript.js`.
  - [x] Removed the `createRequire` banner hack because generated bundle has no `__require(...)` callsites.
  - [x] Kept `site/build-api.mjs` itself because it is still the site API bundling entrypoint.
- [x] Verification:
  - [x] `yarn test "./src/build/TypeMapping.spec.json" "./src/build/TypeParsing.spec.json" "./src/common/TypeParsing/ParsingUtils/ParsingUtils.spec.json"` (passes; this runner also executes the full suite)
  - [x] `yarn site:build:api` (passes)
