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

1. Move those 2 files to the `src/build` barrel and export them from there, ONLY. (Bring their tests with them.)
2. Fix the `src/build` index.
3. Update all docs, tests, examples, supporting files, references, usages in scripts and/or demo site assets.
4. Evaluate if the script `site/build-api.mjs` is still required after this change. (It feels like a hack, but keep it
   if we have to.)
