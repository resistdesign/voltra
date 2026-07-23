/**
 * @packageDocumentation
 *
 * Inspectable in-memory structured backend with DynamoDB record parity.
 */
import type { AttributeMap } from "../ddb/Types";
import { InMemoryDynamoQueryClient } from "../ddb/InMemoryDynamoQueryClient";
import type { StructuredSearchDependencies } from "./SearchStructured";
import type { StructuredWriter } from "./Handlers";
import type { StructuredDocFieldsRecord } from "./StructuredDdb";
import {
  StructuredDdbBackend,
  type StructuredDdbConfig,
} from "./StructuredDdbBackend";
import type { StructuredStringTokenizerConfig } from "./StructuredStringLike";
import type { StructuredWriteContext } from "./StructuredOccupancy";
import type { DocId } from "../Types";

const STRUCTURED_IN_MEMORY_TABLE = "StructuredInMemoryIndex";

/**
 * Structured backend that runs the DynamoDB implementation over an inspectable
 * in-memory `pk`/`sk` table.
 *
 * It deliberately does not maintain a separate logical indexing algorithm.
 * Normal writes, derived records, conditional versions, queries, cursors, and
 * rebuilds therefore exercise the same mechanism used by
 * {@link StructuredDdbBackend}.
 */
export class StructuredInMemoryBackend
  implements StructuredSearchDependencies, StructuredWriter
{
  private readonly client = new InMemoryDynamoQueryClient();
  private readonly backend: StructuredDdbBackend;
  private readonly tableName = STRUCTURED_IN_MEMORY_TABLE;

  /** Term lookup implementation backed by persisted structured-term records. */
  readonly terms: StructuredSearchDependencies["terms"];

  /** Range traversal backed by persisted structured-range records. */
  readonly ranges: StructuredSearchDependencies["ranges"];

  /** Sparse occupancy traversal backed by persisted occupancy cells. */
  readonly occupancy: NonNullable<StructuredSearchDependencies["occupancy"]>;

  /** Optional-value traversal backed by persisted missing-value records. */
  readonly missing: NonNullable<StructuredSearchDependencies["missing"]>;

  /** Canonical structured fields persisted alongside derived records. */
  readonly documents: StructuredSearchDependencies["documents"];

  /** Optional repair/compaction lifecycle with DynamoDB-equivalent state. */
  readonly occupancyMaintenance: StructuredDdbBackend["occupancyMaintenance"];

  /**
   * @param tokenizer Optional tokenizer overrides for structured contains
   * indexing.
   */
  constructor(readonly tokenizer?: Partial<StructuredStringTokenizerConfig>) {
    const config: StructuredDdbConfig = {
      client: this.client,
      table: { tableName: this.tableName },
      tokenizer,
    };
    this.backend = new StructuredDdbBackend(config);
    this.terms = this.backend.reader.terms;
    this.ranges = this.backend.reader.ranges;
    this.occupancy = this.backend.reader.occupancy!;
    this.missing = this.backend.reader.missing!;
    this.documents = this.backend.reader.documents;
    this.occupancyMaintenance = this.backend.occupancyMaintenance;
  }

  /**
   * Write one canonical document and every Dynamo-equivalent derived record.
   */
  async write(
    docId: DocId,
    fields: StructuredDocFieldsRecord,
    context: StructuredWriteContext = {},
  ): Promise<void> {
    await this.backend.writer.write(docId, fields, context);
  }

  /**
   * Begin an optional replacement-generation repair/compaction.
   *
   * @deprecated Prefer {@link occupancyMaintenance}.
   */
  async beginOccupancyRebuild(generation: string): Promise<void> {
    await this.occupancyMaintenance.beginRebuild(generation);
  }

  /**
   * Activate an optional replacement generation.
   *
   * @deprecated Prefer {@link occupancyMaintenance}.
   */
  async activateOccupancyRebuild(): Promise<void> {
    await this.occupancyMaintenance.activateRebuild();
  }

  /** Deep-cloned raw objects currently stored in the in-memory index table. */
  snapshotIndexRecords(): AttributeMap[] {
    return this.client.snapshot(this.tableName);
  }

  /** Deep-cloned `pk`/`sk` keyed map of the in-memory index table. */
  snapshotIndexRecordMap(): ReadonlyMap<string, AttributeMap> {
    return this.client.snapshotMap(this.tableName);
  }
}
