/**
 * The basic API for a database driver with CRUD and Find.
 * */
export interface IBasicDatabaseDriver {
  createItem: (
    type: string,
    id: string,
    item: Record<string, string>,
  ) => Promise<void>;
  readItem: (
    type: string,
    id: string,
    getProperties?: string[],
  ) => Promise<Record<string, string>>;
  updateItem: (
    type: string,
    id: string,
    item: Record<string, string | null>,
  ) => Promise<void>;
  deleteItem: (type: string, id: string) => Promise<void>;
  findItems: (
    type: string,
    properties: string[],
    value: string,
    getProperties?: string[],
  ) => Promise<Record<string, string>[]>;
}
