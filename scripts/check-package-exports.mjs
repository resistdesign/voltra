import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fastGlob from "fast-glob";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(dirname, "..");
const packageJsonPath = path.join(repoRoot, "package.json");
const distDir = path.join(repoRoot, "dist");

const requiredExports = [
  "./api",
  "./app",
  "./web",
  "./native",
  "./common",
  "./iac",
  "./iac/packs",
];

const requiredDistFiles = [
  "api/index.js",
  "app/index.js",
  "web/index.js",
  "native/index.js",
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

const run = async () => {
  await checkPackageJson();
  await checkDistArtifacts();
  await checkNoRootImports();

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
