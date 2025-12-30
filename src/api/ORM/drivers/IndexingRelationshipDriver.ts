/**
 * @packageDocumentation
 *
 * Relationship driver that maps ORM relationship operations to the indexing
 * relational backends (in-memory or DynamoDB).
 */
import {
  BaseItemRelationshipInfo,
  ItemRelationshipInfo,
  ItemRelationshipInfoIdentifyingKeys,
  ItemRelationshipInfoKeys,
  ItemRelationshipOriginItemInfo,
} from "../../../common/ItemRelationshipInfoTypes";
import { ListItemsResults, ListRelationshipsConfig } from "../../../common/SearchTypes";
import type { Edge, EdgeKey, EdgePage, RelationalQueryOptions } from "../../Indexing/rel/types";

type EdgeMetadata = Record<string, unknown>;

/**
 * Relational backend interface for relationship edge operations.
 */
export type RelationalBackend<TMetadata extends EdgeMetadata = EdgeMetadata> = {
  /**
   * Insert or update an edge.
   * @param edge Edge to store.
   * @returns Promise resolved once stored.
   */
  putEdge(edge: Edge<TMetadata>): Promise<void> | void;
  /**
   * Remove an edge by key.
   * @param key Edge key to remove.
   * @returns Promise resolved once removed.
   */
  removeEdge(key: EdgeKey): Promise<void> | void;
  /**
   * Query outgoing edges for an entity and relation.
   * @param fromId Source entity id.
   * @param relation Relation name.
   * @param options Optional paging options.
   * @returns Page of outgoing edges.
   */
  getOutgoing(
    fromId: string,
    relation: string,
    options?: RelationalQueryOptions,
  ): Promise<EdgePage<TMetadata>> | EdgePage<TMetadata>;
  /**
   * Query incoming edges for an entity and relation.
   * @param toId Target entity id.
   * @param relation Relation name.
   * @param options Optional paging options.
   * @returns Page of incoming edges.
   */
  getIncoming(
    toId: string,
    relation: string,
    options?: RelationalQueryOptions,
  ): Promise<EdgePage<TMetadata>> | EdgePage<TMetadata>;
};

/**
 * Configuration for the indexing relationship driver.
 */
export type IndexingRelationshipDriverConfig = {
  /**
   * Relational backend used for edge operations.
   */
  backend: RelationalBackend;
  /**
   * Resolver for relation name from type/field.
   */
  relationNameFor: (fromTypeName: string, fromTypeFieldName: string) => string;
  /**
   * Optional encoder for entity ids.
   */
  encodeEntityId?: (typeName: string, primaryFieldValue: string) => string;
  /**
   * Optional decoder for entity ids.
   */
  decodeEntityId?: (typeName: string, entityId: string) => string;
};

const defaultEncodeEntityId = (typeName: string, primaryFieldValue: string): string =>
  `${typeName}#${primaryFieldValue}`;

const defaultDecodeEntityId = (typeName: string, entityId: string): string => {
  const prefix = `${typeName}#`;
  return entityId.startsWith(prefix) ? entityId.slice(prefix.length) : entityId;
};

const buildRelationshipId = (edgeKey: EdgeKey): string =>
  `${edgeKey.from}|${edgeKey.relation}|${edgeKey.to}`;

/**
 * Adapter that stores relationships as directional edges via a relational backend.
 */
export class IndexingRelationshipDriver {
  private readonly encodeEntityId: (typeName: string, primaryFieldValue: string) => string;
  private readonly decodeEntityId: (typeName: string, entityId: string) => string;

  /**
   * @param config Driver configuration for relation indexing.
   */
  constructor(private readonly config: IndexingRelationshipDriverConfig) {
    this.encodeEntityId = config.encodeEntityId ?? defaultEncodeEntityId;
    this.decodeEntityId = config.decodeEntityId ?? defaultDecodeEntityId;
  }

  private buildEdgeKey(
    relationship: BaseItemRelationshipInfo,
    toTypeName: string,
  ): EdgeKey {
    const { fromTypeName, fromTypeFieldName, fromTypePrimaryFieldValue, toTypePrimaryFieldValue } =
      relationship;
    const relation = this.config.relationNameFor(fromTypeName, fromTypeFieldName);

    return {
      from: this.encodeEntityId(fromTypeName, String(fromTypePrimaryFieldValue)),
      to: this.encodeEntityId(toTypeName, String(toTypePrimaryFieldValue)),
      relation,
    };
  }

  private buildRelationshipInfo(
    edge: Edge,
    origin: ItemRelationshipOriginItemInfo,
    toTypeName: string,
  ): ItemRelationshipInfo {
    const { fromTypeName, fromTypeFieldName } = origin;
    const fromTypePrimaryFieldValue = this.decodeEntityId(fromTypeName, edge.key.from);
    const toTypePrimaryFieldValue = this.decodeEntityId(toTypeName, edge.key.to);

    return {
      [ItemRelationshipInfoIdentifyingKeys.id]: buildRelationshipId(edge.key),
      [ItemRelationshipInfoKeys.fromTypeName]: fromTypeName,
      [ItemRelationshipInfoKeys.fromTypeFieldName]: fromTypeFieldName,
      [ItemRelationshipInfoKeys.fromTypePrimaryFieldValue]: fromTypePrimaryFieldValue,
      [ItemRelationshipInfoKeys.toTypePrimaryFieldValue]: toTypePrimaryFieldValue,
    };
  }

  private async removeAllOutgoing(
    fromId: string,
    relation: string,
  ): Promise<void> {
    let cursor: string | undefined = undefined;

    do {
      const page = await this.config.backend.getOutgoing(fromId, relation, { limit: 100, cursor });
      await Promise.all(page.edges.map((edge) => this.config.backend.removeEdge(edge.key)));
      cursor = page.nextCursor;
    } while (cursor);
  }

  /**
   * Create a relationship via the relational backend.
   * @returns Promise resolved once the relationship is stored.
   */
  async createRelationship(
    /**
     * Relationship info to create.
     */
    relationship: BaseItemRelationshipInfo,
    /**
     * Target type name for the relationship.
     */
    toTypeName: string,
    /**
     * When true, remove existing outgoing edges before inserting.
     */
    ensureSingle: boolean,
  ): Promise<void> {
    const edgeKey = this.buildEdgeKey(relationship, toTypeName);

    if (ensureSingle) {
      await this.removeAllOutgoing(edgeKey.from, edgeKey.relation);
    }

    await this.config.backend.putEdge({ key: edgeKey });
  }

  /**
   * Delete a relationship via the relational backend.
   * @returns Promise resolved once the relationship is removed.
   */
  async deleteRelationship(
    /**
     * Relationship info to delete.
     */
    relationship: BaseItemRelationshipInfo,
    /**
     * Target type name for the relationship.
     */
    toTypeName: string,
  ): Promise<void> {
    const edgeKey = this.buildEdgeKey(relationship, toTypeName);
    await this.config.backend.removeEdge(edgeKey);
  }

  /**
   * List relationships via the relational backend.
   * @returns List results with items and cursor.
   */
  async listRelationships(
    /**
     * Relationship list configuration and origin.
     */
    config: ListRelationshipsConfig,
    /**
     * Target type name for the relationship.
     */
    toTypeName: string,
  ): Promise<ListItemsResults<ItemRelationshipInfo>> {
    const { relationshipItemOrigin, itemsPerPage, cursor } = config;
    const { fromTypeName, fromTypeFieldName, fromTypePrimaryFieldValue } =
      relationshipItemOrigin;
    const relation = this.config.relationNameFor(fromTypeName, fromTypeFieldName);
    const fromId = this.encodeEntityId(fromTypeName, String(fromTypePrimaryFieldValue));
    const options: RelationalQueryOptions = {
      limit: itemsPerPage,
      cursor,
    };
    const page = await this.config.backend.getOutgoing(fromId, relation, options);
    const items = page.edges.map((edge) =>
      this.buildRelationshipInfo(edge, relationshipItemOrigin, toTypeName),
    );

    return {
      items,
      cursor: page.nextCursor,
    };
  }
}
