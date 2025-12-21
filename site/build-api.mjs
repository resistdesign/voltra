import { build } from "esbuild";

await build({
  entryPoints: ["site/api/index.ts"],
  bundle: true,
  platform: "node",
  target: "node20",
  format: "cjs",
  outfile: "site-dist/api/index.js",
  sourcemap: false,
  external: ["aws-sdk"],
});
