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

const runTsc = (configPath) => {
  try {
    execFileSync(
      process.execPath,
      [tscPath, "--pretty", "false", "--project", configPath],
      { stdio: "pipe" },
    );
    return { ok: true };
  } catch (error) {
    const stderr = error?.stderr?.toString?.() ?? "";
    const stdout = error?.stdout?.toString?.() ?? "";
    return { ok: false, stderr, stdout };
  }
};

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
      devDependencies: {
        "@types/node": "^20.11.6",
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
        module: "ESNext",
        moduleResolution: "bundler",
        target: "ES2022",
        noEmit: true,
        types: ["node"],
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

    const validResult = runTsc(path.join(consumerDir, "tsconfig.valid.json"));
    if (!validResult.ok) {
      throw new Error(
        `Valid imports failed:\n${validResult.stdout}${validResult.stderr}`,
      );
    }

    const deepResult = runTsc(path.join(consumerDir, "tsconfig.deep.json"));
    const deepImportFailed = !deepResult.ok;

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
