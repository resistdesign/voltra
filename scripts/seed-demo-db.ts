import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { TypeInfoORMClient } from "../src/app/utils";
import {
  RelationshipValidationType,
  validateTypeInfoValue,
} from "../src/common/TypeParsing/Validation";
import { TypeOperation } from "../src/common/TypeParsing/TypeInfo";
import {
  BASE_DOMAIN,
  DEMO_ORM_ROUTE_PATH,
  DOMAINS,
} from "../site/common/Constants";
import * as DemoTypeInfoMapModule from "../site/common/DemoTypeInfoMap";

type SeedRow = Record<string, string>;
type FieldInfo = {
  type?: unknown;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SEED_DIR = path.join(__dirname, "seed-data");
const argv = new Set(process.argv.slice(2));
const dryRun = argv.has("--dryrun");
const demoTypeInfoMap =
  (DemoTypeInfoMapModule as any).DemoTypeInfoMap ??
  (DemoTypeInfoMapModule as any).default;

type ValidationIssue = {
  typeName: string;
  operation: "create";
  rowIndex: number;
  item: any;
  error: any;
  errorMap: Record<string, any>;
};

type CreateIssue = {
  typeName: string;
  rowIndex: number;
  item: any;
  error: unknown;
};

const getApiDomain = (hostname: string) => {
  if (hostname === DOMAINS.API) {
    return hostname;
  }

  if (hostname.endsWith(BASE_DOMAIN)) {
    return DOMAINS.API;
  }

  return hostname;
};

const getServiceConfig = () => {
  // Default to the public demo API domain. Allow override if you ever want it:
  // DEMO_API_ORIGIN="http://localhost:8787"
  const origin = process.env.DEMO_API_ORIGIN ?? `https://${DOMAINS.API}`;
  const url = new URL(origin);

  const safeProtocol = url.protocol.replace(":", "");
  const apiDomain = getApiDomain(url.hostname);
  const apiPort =
    url.hostname === apiDomain && url.port ? Number(url.port) : undefined;

  return {
    protocol: safeProtocol,
    domain: apiDomain,
    port: apiPort,
    basePath: DEMO_ORM_ROUTE_PATH,
  };
};

const parseCsvLine = (line: string): string[] => {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (ch === '"') {
      const next = line[i + 1];
      if (inQuotes && next === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      out.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }

  out.push(cur.trim());
  return out;
};

const parseCsv = (text: string): SeedRow[] => {
  const lines = text
    .split(/\r?\n/g)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) {
    return [];
  }

  const headers = parseCsvLine(lines[0]);

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row: SeedRow = {};

    for (let i = 0; i < headers.length; i++) {
      row[headers[i]] = values[i] ?? "";
    }

    return row;
  });
};

const readCsv = async (filename: string) => {
  const fullPath = path.join(SEED_DIR, filename);
  const text = await fs.readFile(fullPath, "utf8");
  return parseCsv(text);
};

const asNumber = (v: string) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

const normalizeErrorMap = (errorMap: Record<string, any>) => {
  return Object.fromEntries(
    Object.entries(errorMap).map(([field, issues]) => [
      field,
      Array.isArray(issues) && issues.length > 0 ? issues[0] : undefined,
    ]),
  );
};

const validateSeedItem = (
  typeName: string,
  item: any,
  rowIndex: number,
): ValidationIssue[] => {
  const createResult = validateTypeInfoValue(
    item,
    typeName,
    demoTypeInfoMap,
    true,
    undefined,
    TypeOperation.CREATE,
    RelationshipValidationType.STRICT_EXCLUDE,
    false,
  );
  const issues: ValidationIssue[] = [];

  if (!createResult.valid) {
    issues.push({
      typeName,
      operation: "create",
      rowIndex,
      item,
      error: createResult.error,
      errorMap: normalizeErrorMap(createResult.errorMap),
    });
  }

  return issues;
};

const parseBoolean = (v: string) => {
  if (v === "true") return true;
  if (v === "false") return false;
  return undefined;
};

const normalizeSeedValue = (rawValue: string, fieldInfo?: FieldInfo) => {
  if (rawValue === "") {
    return undefined;
  }

  if (fieldInfo?.type === "number") {
    return asNumber(rawValue);
  }

  if (fieldInfo?.type === "boolean") {
    return parseBoolean(rawValue);
  }

  if (fieldInfo?.type === "true") {
    return rawValue === "true" ? true : undefined;
  }

  if (fieldInfo?.type === "false") {
    return rawValue === "false" ? false : undefined;
  }

  return rawValue;
};

const toSeedItem = (typeName: string, row: SeedRow) => {
  const fields = demoTypeInfoMap?.[typeName]?.fields ?? {};

  return Object.fromEntries(
    Object.entries(row)
      .filter(([fieldName]) => fieldName !== "id" && fields[fieldName])
      .map(([fieldName, rawValue]) => [
        fieldName,
        normalizeSeedValue(rawValue, fields[fieldName]),
      ])
      .filter(([, value]) => value !== undefined),
  );
};

const main = async () => {
  const cars = await readCsv("Car.csv");
  const people = await readCsv("Person.csv");
  const carItems = cars.map((row) => toSeedItem("Car", row));
  const personItems = people.map((row) => toSeedItem("Person", row));
  const validationIssues: ValidationIssue[] = [];

  if (!demoTypeInfoMap) {
    throw new Error("DemoTypeInfoMap is unavailable.");
  }

  for (let i = 0; i < carItems.length; i++) {
    validationIssues.push(...validateSeedItem("Car", carItems[i], i));
  }

  for (let i = 0; i < personItems.length; i++) {
    validationIssues.push(...validateSeedItem("Person", personItems[i], i));
  }

  if (validationIssues.length > 0) {
    throw {
      message:
        "Seed data preflight validation failed. Fix validation errors before API create.",
      dryRun,
      counts: {
        cars: carItems.length,
        people: personItems.length,
        totalIssues: validationIssues.length,
      },
      issues: validationIssues,
    };
  }

  if (dryRun) {
    console.log(
      JSON.stringify(
        {
          dryRun: true,
          message: "Seed data preflight validation passed.",
          counts: {
            cars: carItems.length,
            people: personItems.length,
          },
        },
        null,
        2,
      ),
    );
    return;
  }

  const config = getServiceConfig();
  const ormClient = new TypeInfoORMClient(config);
  const createIssues: CreateIssue[] = [];

  let carCreates = 0;
  let personCreates = 0;

  for (const [rowIndex, item] of carItems.entries()) {
    try {
      await ormClient.create("Car", item);
      carCreates++;
    } catch (error) {
      createIssues.push({ typeName: "Car", rowIndex, item, error });
    }
  }

  for (const [rowIndex, item] of personItems.entries()) {
    try {
      await ormClient.create("Person", item);
      personCreates++;
    } catch (error) {
      createIssues.push({ typeName: "Person", rowIndex, item, error });
    }
  }

  if (createIssues.length > 0) {
    throw {
      message:
        "Seed API create encountered one or more errors after preflight validation.",
      dryRun: false,
      counts: {
        cars: carItems.length,
        people: personItems.length,
        totalCreateIssues: createIssues.length,
      },
      issues: createIssues,
    };
  }

  console.log(
    JSON.stringify(
      {
        domain: config.domain,
        basePath: config.basePath,
        counts: {
          cars: {
            creates: carCreates,
            total: cars.length,
          },
          people: {
            creates: personCreates,
            total: people.length,
          },
        },
      },
      null,
      2,
    ),
  );
};

await main();
