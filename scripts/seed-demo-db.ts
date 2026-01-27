import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { TypeInfoORMClient } from "../src/app/utils";
import {
  BASE_DOMAIN,
  DEMO_ORM_ROUTE_PATH,
  DOMAINS,
} from "../site/common/Constants";

type SeedRow = Record<string, string>;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SEED_DIR = path.join(__dirname, "seed-data");

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

const seedUpsert = async (
  ormClient: TypeInfoORMClient,
  typeName: string,
  item: any,
) => {
  try {
    await ormClient.create(typeName, item);
    return { op: "create" as const };
  } catch (createError) {
    try {
      await ormClient.update(typeName, item);
      return { op: "update" as const, createError };
    } catch (updateError) {
      throw {
        message: `Failed to create or update ${typeName}`,
        typeName,
        item,
        createError,
        updateError,
      };
    }
  }
};

const main = async () => {
  const config = getServiceConfig();
  const ormClient = new TypeInfoORMClient(config);

  const cars = await readCsv("Car.csv");
  const people = await readCsv("Person.csv");

  let carCreates = 0;
  let carUpdates = 0;
  let personCreates = 0;
  let personUpdates = 0;

  for (const row of cars) {
    const item = {
      id: row.id || undefined,
      make: row.make,
      model: row.model,
      year: asNumber(row.year),
    };

    const r = await seedUpsert(ormClient, "Car", item);
    if (r.op === "create") carCreates++;
    if (r.op === "update") carUpdates++;
  }

  for (const row of people) {
    const item = {
      id: row.id || undefined,
      firstName: row.firstName,
      lastName: row.lastName,
      age: asNumber(row.age),
      phoneNumber: row.phoneNumber,
      email: row.email,
      car: row.car,
      dietaryRestrictions: row.dietaryRestrictions,
    };

    const r = await seedUpsert(ormClient, "Person", item);
    if (r.op === "create") personCreates++;
    if (r.op === "update") personUpdates++;
  }

  console.log(
    JSON.stringify(
      {
        domain: config.domain,
        basePath: config.basePath,
        counts: {
          cars: {
            creates: carCreates,
            updates: carUpdates,
            total: cars.length,
          },
          people: {
            creates: personCreates,
            updates: personUpdates,
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
