/**
 * @packageDocumentation
 *
 * DynamoDB schema helpers for the lossy postings table. The lossy index stores
 * token -> docId mappings for recall-oriented search.
 */
import type { DocId } from "../types.js";

export type LossyDdbKey = {
  token: string;
  indexField: string;
  docId: DocId;
};

export type LossyDdbItem = LossyDdbKey;

export const lossyDdbSchema = {
  partitionKey: 'token',
  sortKey: 'docId',
} as const;

export function buildLossyDdbKey(token: string, indexField: string, docId: DocId): LossyDdbKey {
  return { token, indexField, docId };
}
