import type { TypeInfoORMReindexStoredTypeResults } from "./TypeInfoORMService";

/** Minimal generation controller accepted by the ORM rebuild workflow. */
export type StructuredOccupancyRebuildController = {
  /** Return the current active/building generations. */
  getState(): Promise<{
    activeGeneration?: string;
    buildingGeneration?: string;
  }>;
  /** Open a new building generation. */
  beginRebuild(generation: string): Promise<void>;
  /** Promote the completed building generation. */
  activateRebuild(): Promise<void>;
};

/** Minimal ORM maintenance surface required to rebuild occupancy. */
export type StructuredOccupancyReindexer = {
  /** Reindex every stored item for one type. */
  reindexStoredType(
    typeName: string,
    config?: { itemsPerPage?: number },
  ): Promise<TypeInfoORMReindexStoredTypeResults>;
};

/** Inputs for one resumable occupancy-generation rebuild. */
export type RebuildStructuredOccupancyConfig = {
  controller: StructuredOccupancyRebuildController;
  orm: StructuredOccupancyReindexer;
  generation: string;
  typeNames: string[];
  itemsPerPage?: number;
};

/** Result summary for one occupancy-generation rebuild. */
export type RebuildStructuredOccupancyResult = {
  generation: string;
  previousGeneration?: string;
  alreadyActive: boolean;
  processedByType: Record<string, number>;
  processedCount: number;
};

/**
 * Rebuild and activate one complete occupancy generation from canonical items.
 *
 * The workflow is resumable: if the requested generation is already building,
 * every type is safely reindexed again. Normal writers dual-write while this
 * runs, and activation occurs only after every requested type completes.
 */
export async function rebuildStructuredOccupancy({
  controller,
  orm,
  generation,
  typeNames,
  itemsPerPage,
}: RebuildStructuredOccupancyConfig): Promise<RebuildStructuredOccupancyResult> {
  if (!generation) {
    throw new Error("A structured occupancy generation is required.");
  }
  const uniqueTypeNames = Array.from(
    new Set(typeNames.map((typeName) => typeName.trim()).filter(Boolean)),
  );
  if (uniqueTypeNames.length === 0) {
    throw new Error(
      "At least one type is required to rebuild structured occupancy.",
    );
  }
  const state = await controller.getState();
  if (state.activeGeneration === generation && !state.buildingGeneration) {
    return {
      generation,
      previousGeneration: state.activeGeneration,
      alreadyActive: true,
      processedByType: {},
      processedCount: 0,
    };
  }
  if (state.buildingGeneration && state.buildingGeneration !== generation) {
    throw new Error(
      `Structured occupancy generation ${state.buildingGeneration} is already building.`,
    );
  }
  if (!state.buildingGeneration) {
    await controller.beginRebuild(generation);
  }

  const processedByType: Record<string, number> = {};
  for (const typeName of uniqueTypeNames) {
    const result = await orm.reindexStoredType(typeName, { itemsPerPage });
    processedByType[typeName] = result.processedCount;
  }
  await controller.activateRebuild();

  return {
    generation,
    previousGeneration: state.activeGeneration,
    alreadyActive: false,
    processedByType,
    processedCount: Object.values(processedByType).reduce(
      (total, count) => total + count,
      0,
    ),
  };
}
