/**
 * The basic API for a database driver with CRUD and Find.
 * */
export interface IBasicDatabaseDriver {
  /**
   * Create an item in the database.
   * */
  createItem: (
    type: string,
    id: string,
    item: Record<string, string>,
  ) => Promise<void>;
  /**
   * Read an item from the database.
   * */
  readItem: (
    type: string,
    id: string,
    getProperties?: string[],
  ) => Promise<Record<string, string>>;
  /**
   * Update an item in the database.
   * */
  updateItem: (
    type: string,
    id: string,
    item: Record<string, string | null>,
  ) => Promise<void>;
  /**
   * Delete an item from the database.
   * */
  deleteItem: (type: string, id: string) => Promise<void>;
  /**
   * List items in the database.
   * */
  findItems: (
    type: string,
    properties: string[],
    value: string,
    getProperties?: string[],
  ) => Promise<Record<string, string>[]>;
}
