import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  ListObjectsV2CommandOutput,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { Readable } from "node:stream";
import { BasicDBDriver } from "../Types";

export const tokenizeText = (text: string): string[] =>
  text
    .toLowerCase()
    // Split at white space.
    .split(/\s+/)
    .filter((word) => word.length > 0);
export const makePath = (parts: string[]): string =>
  parts
    .map(
      // URL encode each part.
      (part) => encodeURIComponent(part),
    )
    .join("/");
export const expendPath = (path: string): string[] =>
  path.split("/").map(
    // URL decode each part.
    (part) => decodeURIComponent(part),
  );

/**
 * A basic database driver that stores objects in S3 with _advanced_ indexing for searching.
 * */
export class S3BasicDBDriver implements BasicDBDriver {
  public static INDEX_FOLDER = "INDEX";
  public static REVERSE_INDEX_FOLDER = "REVERSE_INDEX";
  public static INDEX_MARKER = "TRUE";
  public static DATA_FOLDER = "DATA";

  protected fileClient: S3Client;
  protected databaseFolder: string;

  constructor(
    protected bucketName: string,
    databaseFolder: string[] = ["__DATABASE__"],
    region: string = "us-east-1",
  ) {
    this.fileClient = new S3Client({
      region,
    });
    this.databaseFolder = makePath(databaseFolder);
  }

  protected fullPathExists = async (path: string[]) => {
    try {
      const { Contents } = await this.fileClient.send(
        new ListObjectsV2Command({
          Bucket: this.bucketName,
          Prefix: makePath(path),
          MaxKeys: 1, // We only need to check if at least one object exists with this prefix
        }),
      );

      return !!Contents && Contents.length > 0;
    } catch (e) {
      return false;
    }
  };

  protected storeValue = async (path: string[], value: string = "") => {
    return this.fileClient.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: makePath(path),
        Body: value,
      }),
    );
  };

  protected getStoredValue = async (path: string[]) => {
    const { Body } = await this.fileClient.send(
      new GetObjectCommand({
        Bucket: this.bucketName,
        Key: makePath(path),
      }),
    );

    return new Promise((resolve, reject) => {
      if (Body instanceof Readable) {
        let data = "";
        Body.on("data", (chunk) => {
          data += chunk;
        });
        Body.on("end", () => {
          resolve(data);
        });
        Body.on("error", (err) => {
          reject(err);
        });
      } else {
        resolve(Body ? Body.toString() : undefined);
      }
    });
  };

  protected removeValue = async (path: string[]) => {
    return this.fileClient.send(
      new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: makePath(path),
      }),
    );
  };

  protected listDirectContentPaths = async (path: string[]) => {
    const fullPaths: string[][] = [];

    let pageToken: string | undefined = undefined;

    while (true) {
      const { Contents, NextContinuationToken }: ListObjectsV2CommandOutput =
        await this.fileClient.send(
          new ListObjectsV2Command({
            Bucket: this.bucketName,
            Prefix: makePath(path),
            ContinuationToken: pageToken,
          }),
        );

      pageToken = NextContinuationToken;

      if (Contents && Contents.length > 0) {
        for (const content of Contents) {
          fullPaths.push(expendPath(content.Key as string));
        }

        if (!pageToken) {
          break;
        }
      } else {
        break;
      }
    }

    return fullPaths;
  };

  protected databasePathExists = async (path: string[]) => {
    return this.fullPathExists([this.databaseFolder, ...path]);
  };

  protected indexPathExists = async (path: string[]) => {
    return this.databasePathExists([
      S3BasicDBDriver.INDEX_FOLDER,
      ...path,
    ]);
  };

  protected reverseIndexPathExists = async (path: string[]) => {
    return this.databasePathExists([
      S3BasicDBDriver.REVERSE_INDEX_FOLDER,
      ...path,
    ]);
  };

  protected dataPathExists = async (path: string[]) => {
    return this.databasePathExists([
      S3BasicDBDriver.DATA_FOLDER,
      ...path,
    ]);
  };

  protected storeDatabaseValue = async (path: string[], value: string = "") => {
    return this.storeValue([this.databaseFolder, ...path], value);
  };

  protected storeIndexValue = async (path: string[], value: string = "") => {
    return this.storeDatabaseValue(
      [S3BasicDBDriver.INDEX_FOLDER, ...path],
      value,
    );
  };

  protected storeReverseIndexValue = async (
    path: string[],
    value: string = "",
  ) => {
    return this.storeDatabaseValue(
      [S3BasicDBDriver.REVERSE_INDEX_FOLDER, ...path],
      value,
    );
  };

  protected storeDataValue = async (path: string[], value: string = "") => {
    return this.storeDatabaseValue(
      [S3BasicDBDriver.DATA_FOLDER, ...path],
      value,
    );
  };

  protected storeItemPropertyValue = async (
    type: string,
    id: string,
    property: string,
    value: string,
  ) => {
    const itemPropertyPath: string[] = [type, id, property];
    const indexItemPropertyPath: string[] = [type, property, id];
    const tokens = tokenizeText(value);

    await this.removeItemPropertyIndices(type, id, property);

    for (const token of tokens) {
      await this.storeIndexValue(
        [token, ...indexItemPropertyPath],
        S3BasicDBDriver.INDEX_MARKER,
      );
      await this.storeReverseIndexValue(
        [...indexItemPropertyPath, token],
        S3BasicDBDriver.INDEX_MARKER,
      );
    }

    return this.storeDataValue(itemPropertyPath, value);
  };

  protected getStoredDatabaseValue = async (path: string[]) => {
    return this.getStoredValue([this.databaseFolder, ...path]);
  };

  protected getStoredIndexValue = async (path: string[]) => {
    return this.getStoredDatabaseValue([
      S3BasicDBDriver.INDEX_FOLDER,
      ...path,
    ]);
  };

  protected getStoredReverseIndexValue = async (path: string[]) => {
    return this.getStoredDatabaseValue([
      S3BasicDBDriver.REVERSE_INDEX_FOLDER,
      ...path,
    ]);
  };

  protected getStoredDataValue = async (path: string[]) => {
    return this.getStoredDatabaseValue([
      S3BasicDBDriver.DATA_FOLDER,
      ...path,
    ]);
  };

  protected getItemPropertyValue = async (
    type: string,
    id: string,
    property: string,
  ) => {
    return this.getStoredDataValue([type, id, property]);
  };

  protected removeDatabaseValue = async (path: string[]) => {
    return this.removeValue([this.databaseFolder, ...path]);
  };

  protected removeIndexValue = async (path: string[]) => {
    return this.removeDatabaseValue([
      S3BasicDBDriver.INDEX_FOLDER,
      ...path,
    ]);
  };

  protected removeReverseIndexValue = async (path: string[]) => {
    return this.removeDatabaseValue([
      S3BasicDBDriver.REVERSE_INDEX_FOLDER,
      ...path,
    ]);
  };

  protected removeDataValue = async (path: string[]) => {
    return this.removeDatabaseValue([
      S3BasicDBDriver.DATA_FOLDER,
      ...path,
    ]);
  };

  protected removeItemPropertyValue = async (
    type: string,
    id: string,
    property: string,
  ) => {
    const itemPropertyPath = [type, id, property];
    const value = await this.getStoredDataValue(itemPropertyPath);

    if (typeof value === "string") {
      const tokens = tokenizeText(value);

      for (const token of tokens) {
        await this.removeIndexValue([token, type, property, id]);
        await this.removeReverseIndexValue([type, property, id, token]);
      }
    }

    return this.removeDataValue(itemPropertyPath);
  };

  protected removeItemPropertyIndices = async (
    type: string,
    id: string,
    property: string,
  ) => {
    const itemPropertyPath = [type, id, property];
    const itemPropertyPathExists = await this.dataPathExists(itemPropertyPath);

    if (itemPropertyPathExists) {
      const indexItemPropertyPath = [type, property, id];
      const oldIndexedTokens = await this.listReverseIndexContentPaths(
        indexItemPropertyPath,
      );

      for (const token of oldIndexedTokens) {
        await this.removeReverseIndexValue([
          ...indexItemPropertyPath,
          ...token,
        ]);
        await this.removeIndexValue([...token, ...indexItemPropertyPath]);
      }
    }
  };

  protected removeItemIndices = async (type: string, id: string) => {
    const itemPropertyPaths = await this.listDataContentPaths([type, id]);

    for (const itemPropertyPath of itemPropertyPaths) {
      const property: string | undefined = [...itemPropertyPath].pop();

      if (typeof property === "string") {
        await this.removeItemPropertyIndices(type, id, property);
      }
    }
  };

  protected listContentPaths = async (path: string[]) => {
    const fullPaths = await this.listDirectContentPaths(path);
    const paths: string[][] = fullPaths.map((fullPath) => {
      return fullPath.filter((part, index) => index >= path.length);
    });

    return paths;
  };

  protected listDatabaseContentPaths = async (path: string[]) => {
    return this.listContentPaths([this.databaseFolder, ...path]);
  };

  protected listIndexContentPaths = async (path: string[]) => {
    return this.listDatabaseContentPaths([
      S3BasicDBDriver.INDEX_FOLDER,
      ...path,
    ]);
  };

  protected listReverseIndexContentPaths = async (path: string[]) => {
    return this.listDatabaseContentPaths([
      S3BasicDBDriver.REVERSE_INDEX_FOLDER,
      ...path,
    ]);
  };

  protected listDataContentPaths = async (path: string[]) => {
    return this.listDatabaseContentPaths([
      S3BasicDBDriver.DATA_FOLDER,
      ...path,
    ]);
  };

  protected findItemIdsByPropertyToken = async (
    type: string,
    property: string,
    token: string,
  ) => {
    // Get all the ids for token, type, property.
    const indexItemPropertyPath = [token, type, property];
    const itemIds = await this.listIndexContentPaths(indexItemPropertyPath);

    return itemIds;
  };

  protected findUniqueItemIdsByPropertyValue = async (
    type: string,
    property: string,
    value: string,
  ) => {
    const tokens = tokenizeText(value);
    const uniqueItemIds = new Set<string>();

    for (const token of tokens) {
      const tokenItemIds = await this.findItemIdsByPropertyToken(
        type,
        property,
        token,
      );

      for (const itemId of tokenItemIds) {
        if (itemId[0]) {
          uniqueItemIds.add(itemId[0]);
        }
      }
    }

    return Array.from(uniqueItemIds);
  };

  createItem = async (
    type: string,
    id: string,
    item: Record<string, string>,
  ) => {
    for (const property in item) {
      await this.storeItemPropertyValue(type, id, property, item[property]);
    }
  };

  readItem = async (type: string, id: string, getProperties?: string[]) => {
    const item: Record<string, string> = {};
    const itemPropertyPaths = await this.listDataContentPaths([type, id]);

    for (const itemPropertyPath of itemPropertyPaths) {
      const property = [...itemPropertyPath].pop();

      if (typeof property === "string") {
        if (getProperties && !getProperties.includes(property)) {
          continue;
        }

        const value = await this.getItemPropertyValue(type, id, property);

        if (typeof value === "string") {
          item[property] = value;
        }
      }
    }

    return item;
  };

  updateItem = async (
    type: string,
    id: string,
    item: Record<string, string | null>,
  ) => {
    for (const property in item) {
      const value = item[property];

      if (value === null) {
        await this.removeItemPropertyValue(type, id, property);
      } else {
        await this.storeItemPropertyValue(type, id, property, value);
      }
    }
  };

  deleteItem = async (type: string, id: string) => {
    const itemPropertyPaths = await this.listDataContentPaths([type, id]);

    for (const itemPropertyPath of itemPropertyPaths) {
      const property: string | undefined = itemPropertyPath[0] as any;

      if (typeof property === "string") {
        await this.removeItemPropertyValue(type, id, property);
      }
    }
  };

  findItems = async (
    type: string,
    properties: string[],
    value: string,
    getProperties?: string[],
  ) => {
    // Search for value in each property.
    const uniqueItemIds = new Set<string>();

    for (const property of properties) {
      const itemIds = await this.findUniqueItemIdsByPropertyValue(
        type,
        property,
        value,
      );

      for (const itemId of itemIds) {
        uniqueItemIds.add(itemId);
      }
    }

    // Get items.
    const items: Record<string, string>[] = [];
    const uniqueItemIdsArray = Array.from(uniqueItemIds);

    for (const itemId of uniqueItemIdsArray) {
      const item = await this.readItem(type, itemId, getProperties);

      items.push(item);
    }

    return items;
  };
}
