import { build } from "esbuild";
import fs from "node:fs";

await build({
  entryPoints: ["site/api/index.ts"],
  bundle: true,
  platform: "node",
  target: "node20",
  format: "cjs",
  outfile: "site-dist/api/index.js",
  sourcemap: false,
  external: ["aws-sdk"],
  plugins: [
    {
      name: "source-prefix",
      setup(build) {
        build.onResolve({ filter: /^source:/ }, (args) => ({
          path: args.path.replace(/^source:/, ""),
          namespace: "source-text",
          resolveDir: args.resolveDir,
        }));
        build.onLoad({ filter: /.*/, namespace: "source-text" }, async (args) => ({
          contents: await fs.promises.readFile(args.path, "utf8"),
          loader: "text",
        }));
      },
    },
  ],
});
