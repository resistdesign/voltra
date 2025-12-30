import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(dirname, "..");
const distDir = path.join(repoRoot, "dist");
const packageJsonPath = path.join(repoRoot, "package.json");

const copyIfExists = async (source, destination) => {
  try {
    await fs.copyFile(source, destination);
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return;
    }
    throw error;
  }
};

const run = async () => {
  const packageJson = JSON.parse(await fs.readFile(packageJsonPath, "utf8"));
  const {
    name,
    version,
    description,
    homepage,
    repository,
    author,
    license,
    type,
    main,
    types,
    bin,
    exports,
    files,
    dependencies,
  } = packageJson;

  const distPackageJson = {
    name,
    version,
    description,
    homepage,
    repository,
    author,
    license,
    type,
    main,
    types,
    bin,
    exports,
    files,
    dependencies,
  };

  await fs.mkdir(distDir, { recursive: true });
  await fs.writeFile(
    path.join(distDir, "package.json"),
    JSON.stringify(distPackageJson, null, 2),
  );

  await copyIfExists(
    path.join(repoRoot, "README.md"),
    path.join(distDir, "README.md"),
  );
  await copyIfExists(
    path.join(repoRoot, ".npmignore"),
    path.join(distDir, ".npmignore"),
  );
};

run().catch((error) => {
  console.error(error?.message || error);
  process.exit(1);
});
