import { build } from "esbuild";
import fs from "node:fs";
import path from "node:path";

const outputDir = "site-dist/api";
const outputFile = path.join(outputDir, "index.js");

await fs.promises.mkdir(outputDir, { recursive: true });

await build({
  entryPoints: ["site/api/index.ts"],
  bundle: true,
  platform: "node",
  target: "node20",
  format: "esm",
  outfile: outputFile,
  sourcemap: true,
  banner: {
    js: [
      'import { createRequire } from "node:module";',
      "const require = createRequire(import.meta.url);",
    ].join("\n"),
  },
  external: ["aws-sdk"],
  plugins: [
    {
      name: "source-prefix",
      setup(build) {
        build.onResolve({ filter: /^source:/ }, (args) => {
          const strippedPath = args.path.replace(/^source:/, "");
          let absolutePath = path.resolve(args.resolveDir, strippedPath);

          if (!path.extname(absolutePath)) {
            const extensions = [".ts", ".tsx", ".txt", ".md"];
            const matchedPath = extensions
              .map((ext) => `${absolutePath}${ext}`)
              .find((candidate) => fs.existsSync(candidate));

            if (matchedPath) {
              absolutePath = matchedPath;
            }
          }

          return {
            path: absolutePath,
            namespace: "source-text",
          };
        });
        build.onLoad(
          { filter: /.*/, namespace: "source-text" },
          async (args) => ({
            contents: await fs.promises.readFile(args.path, "utf8"),
            loader: "text",
          }),
        );
      },
    },
  ],
});
await fs.promises.writeFile(
  path.join(outputDir, "package.json"),
  JSON.stringify({ type: "module" }, null, 2),
);
