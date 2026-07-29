import {
  TypeInfoORMService,
  qualifyIndexField,
  rebuildStructuredOccupancy,
} from "../../src/api";
import { DemoTypeInfoMap } from "../common/DemoTypeInfoMap";
import { structuredOccupancyMaintenance } from "./indexing";
import { DEMO_ORM_CONFIG } from "./routeMap";

const generation = process.env.STRUCTURED_OCCUPANCY_GENERATION;

if (!generation) {
  throw new Error("STRUCTURED_OCCUPANCY_GENERATION is required.");
}

const orm = new TypeInfoORMService({
  ...DEMO_ORM_CONFIG,
  useDAC: false,
});

const result = await rebuildStructuredOccupancy({
  controller: structuredOccupancyMaintenance,
  orm,
  generation,
  typeNames: Object.keys(DemoTypeInfoMap),
  itemsPerPage: 100,
});

const occupancyFields = Object.entries(
  DEMO_ORM_CONFIG.indexing?.fieldsByType ?? {},
).flatMap(([typeName, fields]) =>
  Object.entries(fields)
    .filter(([, capability]) => capability.range)
    .map(([fieldName, capability]) =>
      qualifyIndexField(typeName, capability.field ?? fieldName),
    ),
);
const retiredPreviousCells =
  result.previousGeneration && result.previousGeneration !== result.generation
    ? await structuredOccupancyMaintenance.retireGeneration(
        result.previousGeneration,
        occupancyFields,
      )
    : 0;

process.stdout.write(
  `${JSON.stringify({ ...result, retiredPreviousCells }, null, 2)}\n`,
);
