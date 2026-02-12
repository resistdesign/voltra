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

const runNodeModule = (args, options = {}) =>
  execFileSync(process.execPath, args, { stdio: "pipe", ...options });

const runBinary = (binaryPath, args, options = {}) =>
  execFileSync(binaryPath, args, { stdio: "pipe", ...options });

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
        "@types/react": "^18.3.0",
      },
    };

    await fs.writeFile(
      path.join(consumerDir, "package.json"),
      JSON.stringify(packageJson, null, 2),
    );

    await fs.writeFile(
      path.join(consumerDir, "valid-imports.ts"),
      [
        'import type { RouteMap } from "@resistdesign/voltra/api";',
        'import {',
        '  DACConstraintType,',
        '  DynamoDBDataItemDBDriver,',
        '  FullTextDdbBackend,',
        '  addRoutesToRouteMap,',
        '  createAwsSdkV3DynamoClient,',
        '  getTypeInfoORMRouteMap,',
        '} from "@resistdesign/voltra/api";',
        'import type { TypeInfo } from "@resistdesign/voltra/common";',
        'import {',
        '  ERROR_MESSAGE_CONSTANTS,',
        '  PRIMITIVE_ERROR_MESSAGE_CONSTANTS,',
        '  TypeInfoORMServiceError,',
        '  collectRequiredEnvironmentVariables,',
        '} from "@resistdesign/voltra/common";',
        'import { AutoField, createWebFormRenderer, getEasyLayout } from "@resistdesign/voltra/web";',
        'import { createNativeFormRenderer, makeNativeEasyLayout } from "@resistdesign/voltra/native";',
        'import { parseTemplate, computeTrackPixels } from "@resistdesign/voltra/app";',
        'import { addDNS } from "@resistdesign/voltra/iac/packs";',
        "",
        "const routeMap: RouteMap = addRoutesToRouteMap({}, []);",
        "const userType: TypeInfo = {",
        '  primaryField: "id",',
        "  fields: {",
        '    id: { type: "string", array: false, readonly: false, optional: false },',
        "  },",
        "};",
        "",
        "export const smoke = () => [",
        "  addDNS,",
        "  routeMap,",
        "  userType,",
        "  TypeInfoORMServiceError.INVALID_OPERATION,",
        "  DACConstraintType.ALLOW,",
        "  DynamoDBDataItemDBDriver,",
        "  FullTextDdbBackend,",
        "  createAwsSdkV3DynamoClient,",
        "  getTypeInfoORMRouteMap,",
        "  collectRequiredEnvironmentVariables,",
        "  ERROR_MESSAGE_CONSTANTS.INVALID_TYPE,",
        "  PRIMITIVE_ERROR_MESSAGE_CONSTANTS.string,",
        "  AutoField,",
        "  createWebFormRenderer,",
        "  getEasyLayout,",
        "  createNativeFormRenderer,",
        "  makeNativeEasyLayout,",
        "  parseTemplate,",
        "  computeTrackPixels,",
        "];",
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

    const installedVoltraRoot = path.join(
      consumerDir,
      "node_modules",
      "@resistdesign",
      "voltra",
    );
    const installedVoltraPackageJsonPath = path.join(
      installedVoltraRoot,
      "package.json",
    );
    const installedVoltraPackageJson = JSON.parse(
      await fs.readFile(installedVoltraPackageJsonPath, "utf8"),
    );
    const installedPeerDependencies =
      installedVoltraPackageJson.peerDependencies ?? {};

    if (!installedPeerDependencies.react) {
      throw new Error(
        "Installed @resistdesign/voltra package is missing peerDependency `react`.",
      );
    }

    try {
      await fs.access(path.join(installedVoltraRoot, "node_modules", "react"));
      throw new Error(
        "Installed @resistdesign/voltra package unexpectedly contains a nested React copy.",
      );
    } catch (error) {
      if (error?.code !== "ENOENT") {
        throw error;
      }
    }

    const validResult = runTsc(path.join(consumerDir, "tsconfig.valid.json"));
    if (!validResult.ok) {
      throw new Error(
        `Valid imports failed:\n${validResult.stdout}${validResult.stderr}`,
      );
    }

    const deepResult = runTsc(path.join(consumerDir, "tsconfig.deep.json"));
    const deepImportFailed = !deepResult.ok;

    if (!deepImportFailed) {
      throw new Error(
        "Deep import unexpectedly resolved. Exports guard failed.",
      );
    }

    runNodeModule(
      [
        "--input-type=module",
        "-e",
        "import('@resistdesign/voltra/iac/packs').then((m)=>{if(!m.addDNS){process.exit(1);}}).catch((err)=>{console.error(err);process.exit(1);});",
      ],
      { cwd: consumerDir },
    );

    try {
      runNodeModule(
        [
          "--input-type=module",
          "-e",
          "import('@resistdesign/voltra/iac/packs/dns').then(()=>process.exit(1)).catch(()=>process.exit(0));",
        ],
        { cwd: consumerDir },
      );
    } catch (_error) {
      throw new Error("Deep runtime import unexpectedly resolved.");
    }

    const vestBin = path.join(
      consumerDir,
      "node_modules",
      ".bin",
      process.platform === "win32" ? "vest.cmd" : "vest",
    );
    runBinary(vestBin, ["--help"], { cwd: consumerDir });
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
    await fs.rm(tarballPath, { force: true });
  }
};

run().catch((error) => {
  console.error(error?.message || error);
  process.exit(1);
});
