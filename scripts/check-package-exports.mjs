import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import fastGlob from "fast-glob";
import ts from "typescript";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(dirname, "..");
const packageJsonPath = path.join(repoRoot, "package.json");
const distDir = path.join(repoRoot, "dist");

const requiredExports = [
  "./api",
  "./app",
  "./web",
  "./native",
  "./build",
  "./common",
  "./iac",
  "./iac/packs",
];

const requiredDistFiles = [
  "api/index.js",
  "app/index.js",
  "web/index.js",
  "native/index.js",
  "build/index.js",
  "common/index.js",
];

const requiredRuntimeExports = [
  {
    distFilePath: "api/index.js",
    names: ["addRoutesToRouteMap", "handleCloudFunctionEvent"],
  },
  {
    distFilePath: "common/index.js",
    names: ["TypeInfoORMServiceError"],
  },
  {
    distFilePath: "web/index.js",
    names: ["createWebFormRenderer", "AutoField"],
  },
  {
    distFilePath: "build/index.js",
    names: ["getTypeInfoMapFromTypeScript"],
  },
];

const errors = [];
const rootImportPattern =
  /(?:from\s+["']@resistdesign\/voltra["']|import\s*\(\s*["']@resistdesign\/voltra["']\s*\))/;

const readUtf8 = async (filePath) => fs.readFile(filePath, "utf8");

const checkPackageJson = async () => {
  const packageJson = JSON.parse(await readUtf8(packageJsonPath));
  const exportsMap = packageJson.exports ?? {};

  if ("main" in packageJson) {
    errors.push("package.json must not define `main`.");
  }
  if ("types" in packageJson) {
    errors.push("package.json must not define root `types`.");
  }
  if (exportsMap["."]) {
    errors.push("package.json exports must not include root export `.`.");
  }

  for (const exportKey of requiredExports) {
    const value = exportsMap[exportKey];
    if (!value) {
      errors.push(`Missing required export: ${exportKey}`);
      continue;
    }
    if (!value.import || !value.types) {
      errors.push(
        `Export ${exportKey} must include both 'import' and 'types' targets.`,
      );
    }
  }
};

const checkDistArtifacts = async () => {
  let distExists = true;
  try {
    await fs.access(distDir);
  } catch {
    distExists = false;
  }

  if (!distExists) {
    errors.push("dist/ not found. Run `yarn build` before export checks.");
    return;
  }

  for (const relativeFilePath of requiredDistFiles) {
    const filePath = path.join(distDir, relativeFilePath);
    try {
      await fs.access(filePath);
    } catch {
      errors.push(`Missing built artifact: dist/${relativeFilePath}`);
    }
  }

  const webIndexPath = path.join(distDir, "web/index.js");
  const nativeIndexPath = path.join(distDir, "native/index.js");

  try {
    const webSource = await readUtf8(webIndexPath);
    if (webSource.includes("react-native")) {
      errors.push(
        "dist/web/index.js should not include native runtime dependency `react-native`.",
      );
    }
  } catch {
    // already tracked as missing file
  }

  try {
    const nativeSource = await readUtf8(nativeIndexPath);
    if (
      nativeSource.includes("window.") ||
      nativeSource.includes("document.")
    ) {
      errors.push(
        "dist/native/index.js should not include DOM globals (`window`/`document`).",
      );
    }
  } catch {
    // already tracked as missing file
  }
};

const checkNoRootImports = async () => {
  const files = await fastGlob(
    [
      "src/**/*.{ts,tsx,js,mjs,cjs}",
      "scripts/**/*.{ts,tsx,js,mjs,cjs}",
      "site/**/*.{ts,tsx,js,mjs,cjs,md,mdx}",
      "README.md",
    ],
    { cwd: repoRoot, dot: false },
  );

  for (const relativeFilePath of files) {
    const filePath = path.join(repoRoot, relativeFilePath);
    const source = await readUtf8(filePath);
    if (rootImportPattern.test(source)) {
      errors.push(
        `Root package import found in ${relativeFilePath}. Use explicit subpath imports only.`,
      );
    }
  }
};

const looksLikeHashedDeclaration = (relativeFilePath) => {
  const fileName = path.basename(relativeFilePath);
  const extension = ".d.ts";

  if (!fileName.endsWith(extension)) {
    return false;
  }

  const indexOfDash = fileName.lastIndexOf("-");
  if (indexOfDash < 0) {
    return false;
  }

  const suffix = fileName.slice(indexOfDash + 1, fileName.length - extension.length);
  if (suffix.length < 6 || !/^[A-Za-z0-9]+$/.test(suffix)) {
    return false;
  }

  return /[0-9]/.test(suffix) || /[A-Z]/.test(suffix);
};

const checkNoHashedDeclarations = async () => {
  const declarations = await fastGlob(["**/*.d.ts"], {
    cwd: distDir,
    dot: false,
  });

  const hashedDeclarations = declarations.filter(looksLikeHashedDeclaration);
  for (const relativeFilePath of hashedDeclarations) {
    errors.push(
      `Hashed declaration output found: dist/${relativeFilePath}. Expected stable tsc declaration filenames only.`,
    );
  }
};

const checkRuntimeSymbolExports = async () => {
  for (const { distFilePath, names } of requiredRuntimeExports) {
    const absoluteFilePath = path.join(distDir, distFilePath);

    try {
      await fs.access(absoluteFilePath);
    } catch {
      // Missing file is already tracked by checkDistArtifacts.
      continue;
    }

    const moduleUrl = pathToFileURL(absoluteFilePath).href;
    const exportedModule = await import(moduleUrl);

    for (const name of names) {
      if (!(name in exportedModule)) {
        errors.push(`Missing runtime export \`${name}\` from dist/${distFilePath}.`);
      }
    }
  }
};

const checkTypeContractWithTypeScript = async () => {
  const probeFilePath = path.join(repoRoot, ".cache", "export-contract-probe.ts");
  const probeSource = `
import type { RouteMap } from "@resistdesign/voltra/api";
import { addRoutesToRouteMap, handleCloudFunctionEvent } from "@resistdesign/voltra/api";
import type { TypeInfo, TypeInfoMap } from "@resistdesign/voltra/common";
import { TypeInfoORMServiceError } from "@resistdesign/voltra/common";
import { createWebFormRenderer, AutoField } from "@resistdesign/voltra/web";
import { createNativeFormRenderer } from "@resistdesign/voltra/native";
import { getTypeInfoMapFromTypeScript } from "@resistdesign/voltra/build";

const routeMap: RouteMap = addRoutesToRouteMap({}, []);
const t: TypeInfo = {};
const tm: TypeInfoMap = {};
void routeMap;
void t;
void tm;
void handleCloudFunctionEvent;
void TypeInfoORMServiceError;
void createWebFormRenderer;
void AutoField;
  void createNativeFormRenderer;
  void getTypeInfoMapFromTypeScript;
`;

  try {
    await fs.mkdir(path.dirname(probeFilePath), { recursive: true });
    await fs.writeFile(probeFilePath, probeSource, "utf8");

    const compilerOptions = {
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      target: ts.ScriptTarget.ESNext,
      jsx: ts.JsxEmit.ReactJSX,
      noEmit: true,
      strict: true,
      skipLibCheck: true,
      types: ["node"],
      baseUrl: repoRoot,
      paths: {
        "@resistdesign/voltra/api": ["dist/api/index.d.ts"],
        "@resistdesign/voltra/common": ["dist/common/index.d.ts"],
        "@resistdesign/voltra/web": ["dist/web/index.d.ts"],
        "@resistdesign/voltra/native": ["dist/native/index.d.ts"],
        "@resistdesign/voltra/build": ["dist/build/index.d.ts"],
      },
    };

    const program = ts.createProgram({
      rootNames: [probeFilePath],
      options: compilerOptions,
    });
    const diagnostics = ts
      .getPreEmitDiagnostics(program)
      .filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error);

    for (const diagnostic of diagnostics) {
      const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
      errors.push(`Type contract compile failed: ${message}`);
    }
  } finally {
    await fs.rm(probeFilePath, { force: true });
  }
};

const run = async () => {
  await checkPackageJson();
  await checkDistArtifacts();
  await checkNoRootImports();
  await checkNoHashedDeclarations();
  await checkRuntimeSymbolExports();
  await checkTypeContractWithTypeScript();

  if (errors.length > 0) {
    console.error("Export validation failed:");
    errors.forEach((error) => console.error(`- ${error}`));
    process.exit(1);
  }

  console.log("Export validation passed.");
};

run().catch((error) => {
  console.error(error?.message || error);
  process.exit(1);
});
