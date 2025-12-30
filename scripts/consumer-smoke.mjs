import { execFileSync } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(dirname, "..");
const distDir = path.join(repoRoot, "dist");
const distPackageJson = path.join(distDir, "package.json");
const tscPath = path.join(repoRoot, "node_modules", "typescript", "bin", "tsc");

const runTsc = (configPath) =>
  execFileSync(process.execPath, [tscPath, "--pretty", "false", "--project", configPath], {
    stdio: "pipe",
  });

const run = async () => {
  try {
    await fs.access(distPackageJson);
  } catch {
    throw new Error("Build output not found. Run `yarn build` first.");
  }

  const tarballName = execFileSync("npm", ["pack"], {
    cwd: distDir,
    encoding: "utf8",
  })
    .trim()
    .split("\n")
    .pop();

  if (!tarballName) {
    throw new Error("npm pack did not return a tarball name.");
  }

  const tarballPath = path.join(distDir, tarballName);
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "voltra-consumer-"));
  const consumerDir = path.join(tempDir, "consumer");

  try {
    await fs.mkdir(consumerDir, { recursive: true });

    const packageJson = {
      name: "voltra-consumer-smoke",
      private: true,
      type: "module",
      dependencies: {
        "@resistdesign/voltra": tarballPath,
      },
    };

    await fs.writeFile(
      path.join(consumerDir, "package.json"),
      JSON.stringify(packageJson, null, 2),
    );

    await fs.writeFile(
      path.join(consumerDir, "valid-imports.ts"),
      [
        'import { IaC } from "@resistdesign/voltra";',
        'import { Packs } from "@resistdesign/voltra/iac";',
        'import { addDNS } from "@resistdesign/voltra/iac/packs";',
        "",
        "export const smoke = () => [IaC.Packs, Packs, addDNS];",
        "",
      ].join("\n"),
    );

    await fs.writeFile(
      path.join(consumerDir, "deep-import.ts"),
      [
        'import addDNS from "@resistdesign/voltra/iac/packs/dns";',
        "",
        "export const smoke = () => addDNS;",
        "",
      ].join("\n"),
    );

    const baseConfig = {
      compilerOptions: {
        module: "NodeNext",
        moduleResolution: "NodeNext",
        target: "ES2022",
        noEmit: true,
        types: [],
      },
    };

    await fs.writeFile(
      path.join(consumerDir, "tsconfig.valid.json"),
      JSON.stringify(
        {
          ...baseConfig,
          files: ["valid-imports.ts"],
        },
        null,
        2,
      ),
    );

    await fs.writeFile(
      path.join(consumerDir, "tsconfig.deep.json"),
      JSON.stringify(
        {
          ...baseConfig,
          files: ["deep-import.ts"],
        },
        null,
        2,
      ),
    );

    execFileSync("npm", ["install", "--no-audit", "--no-fund"], {
      cwd: consumerDir,
      stdio: "inherit",
    });

    runTsc(path.join(consumerDir, "tsconfig.valid.json"));

    let deepImportFailed = false;
    try {
      runTsc(path.join(consumerDir, "tsconfig.deep.json"));
    } catch {
      deepImportFailed = true;
    }

    if (!deepImportFailed) {
      throw new Error("Deep import unexpectedly resolved. Exports guard failed.");
    }
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
    await fs.rm(tarballPath, { force: true });
  }
};

run().catch((error) => {
  console.error(error?.message || error);
  process.exit(1);
});
