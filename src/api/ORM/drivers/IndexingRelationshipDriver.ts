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

export type RelationalBackend<TMetadata extends EdgeMetadata = EdgeMetadata> = {
  putEdge(edge: Edge<TMetadata>): Promise<void> | void;
  removeEdge(key: EdgeKey): Promise<void> | void;
  getOutgoing(
    fromId: string,
    relation: string,
    options?: RelationalQueryOptions,
  ): Promise<EdgePage<TMetadata>> | EdgePage<TMetadata>;
  getIncoming(
    toId: string,
    relation: string,
    options?: RelationalQueryOptions,
  ): Promise<EdgePage<TMetadata>> | EdgePage<TMetadata>;
};

export type IndexingRelationshipDriverConfig = {
  backend: RelationalBackend;
  relationNameFor: (fromTypeName: string, fromTypeFieldName: string) => string;
  encodeEntityId?: (typeName: string, primaryFieldValue: string) => string;
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

export class IndexingRelationshipDriver {
  private readonly encodeEntityId: (typeName: string, primaryFieldValue: string) => string;
  private readonly decodeEntityId: (typeName: string, entityId: string) => string;

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

  async createRelationship(
    relationship: BaseItemRelationshipInfo,
    toTypeName: string,
    ensureSingle: boolean,
  ): Promise<void> {
    const edgeKey = this.buildEdgeKey(relationship, toTypeName);

    if (ensureSingle) {
      await this.removeAllOutgoing(edgeKey.from, edgeKey.relation);
    }

    await this.config.backend.putEdge({ key: edgeKey });
  }

  async deleteRelationship(
    relationship: BaseItemRelationshipInfo,
    toTypeName: string,
  ): Promise<void> {
    const edgeKey = this.buildEdgeKey(relationship, toTypeName);
    await this.config.backend.removeEdge(edgeKey);
  }

  async listRelationships(
    config: ListRelationshipsConfig,
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
