import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: {
      index: "src/index.ts",
      "api/index": "src/api/index.ts",
      "app/index": "src/app/index.ts",
      "common/index": "src/common/index.ts",
      "iac/index": "src/iac/index.ts",
      "iac/packs/index": "src/iac/packs/index.ts",
    },
    format: ["esm"],
    platform: "node",
    target: "es2022",
    bundle: true,
    splitting: false,
    treeshake: true,
    dts: true,
    clean: true,
    outDir: "dist",
    outExtension: () => ({ js: ".js" }),
    tsconfig: "tsconfig.build.json",
  },
  {
    entry: {
      "common/Testing/CLI": "src/common/Testing/CLI.ts",
    },
    format: ["esm"],
    platform: "node",
    target: "es2022",
    bundle: true,
    splitting: false,
    treeshake: true,
    clean: false,
    outDir: "dist",
    outExtension: () => ({ js: ".js" }),
    banner: {
      js: "#!/usr/bin/env node",
    },
    tsconfig: "tsconfig.build.json",
  },
]);
