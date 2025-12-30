import {
  CopyObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { S3FileItemDBDriver } from "./S3FileItemDBDriver";
import { getFullFileKey } from "./S3FileItemDBDriver/S3FileDriver";
import { DATA_ITEM_DB_DRIVER_ERRORS } from "./common/Types";

type StoredObject = {
  key: string;
  contentType: string;
  contentLength: number;
  lastModified: Date;
};

const buildDriver = () => {
  const objects = new Map<string, StoredObject>();
  const driver = new S3FileItemDBDriver({
    tableName: "Files",
    uniquelyIdentifyingFieldName: "id",
    dbSpecificConfig: {
      bucketName: "test-bucket",
      s3Config: {},
      urlExpirationInSeconds: 60,
    },
  });

  const s3 = (driver as any).s3 as {
    send: (command: unknown) => Promise<any>;
  };

  s3.send = async (command: any) => {
    if (command instanceof PutObjectCommand) {
      const key = command.input.Key as string;
      objects.set(key, {
        key,
        contentType: "application/octet-stream",
        contentLength: 0,
        lastModified: new Date("2020-01-01T00:00:00Z"),
      });
      return {};
    }

    if (command instanceof HeadObjectCommand) {
      const key = command.input.Key as string;
      const stored = objects.get(key);
      if (!stored) {
        throw new Error("NotFound");
      }
      return {
        ContentType: stored.contentType,
        ContentLength: stored.contentLength,
        LastModified: stored.lastModified,
        Metadata: {},
      };
    }

    if (command instanceof CopyObjectCommand) {
      const sourceKey = command.input.CopySource as string;
      const targetKey = command.input.Key as string;
      const stored = objects.get(sourceKey);
      if (!stored) {
        throw new Error("NotFound");
      }
      objects.set(targetKey, {
        ...stored,
        key: targetKey,
        lastModified: new Date("2020-01-02T00:00:00Z"),
      });
      return {};
    }

    return {};
  };

  const fileDriver = (driver as any).s3FileDriver as {
    getFileUploadUrl: (file: any, baseDirectory?: string) => Promise<string>;
    getFileDownloadUrl: (file: any, baseDirectory?: string) => Promise<string>;
    deleteFile: (file: any, baseDirectory?: string) => Promise<void>;
    listFiles: (
      path?: string,
      baseDirectory?: string,
      maxNumberOfFiles?: number,
      cursor?: string,
    ) => Promise<{ files: any[]; cursor?: string }>;
  };

  fileDriver.getFileUploadUrl = async (file, baseDirectory) => {
    const key = getFullFileKey({ file, baseDirectory });
    return `upload://${key}`;
  };

  fileDriver.getFileDownloadUrl = async (file, baseDirectory) => {
    const key = getFullFileKey({ file, baseDirectory });
    return `download://${key}`;
  };

  fileDriver.deleteFile = async (file, baseDirectory) => {
    const key = getFullFileKey({ file, baseDirectory });
    objects.delete(key);
  };

  fileDriver.listFiles = async (
    path,
    baseDirectory,
    maxNumberOfFiles = 1,
    cursor,
  ) => {
    const prefix = `${baseDirectory ? `${baseDirectory}/` : ""}${path ?? ""}`;
    const keys = Array.from(objects.keys())
      .filter((key) => key.startsWith(prefix))
      .sort();
    const startIndex = cursor ? keys.findIndex((key) => key === cursor) + 1 : 0;
    const slice =
      maxNumberOfFiles === Infinity
        ? keys.slice(startIndex)
        : keys.slice(startIndex, startIndex + maxNumberOfFiles);
    const nextCursor =
      maxNumberOfFiles !== Infinity && keys.length > startIndex + slice.length
        ? slice[slice.length - 1]
        : undefined;

    const files = slice.map((key) => {
      const stored = objects.get(key);
      return {
        updatedOn: stored?.lastModified.getTime() ?? 0,
        mimeType: stored?.contentType ?? "",
        sizeInBytes: stored?.contentLength ?? 0,
        directory: path,
        name: key.split("/").pop() || "",
        isDirectory: stored?.contentType === "application/x-directory",
      };
    });

    return { files, cursor: nextCursor };
  };

  return { driver, objects };
};

export const runS3FileItemDriverScenario = async () => {
  const { driver, objects } = buildDriver();

  const id1 = await driver.createItem({ name: "alpha.txt", directory: "" });
  const id2 = await driver.createItem({ name: "beta.txt", directory: "" });

  const readWithUrls = await driver.readItem(id1, ["uploadUrl", "downloadUrl"]);

  await driver.updateItem(id1, { name: "alpha.txt", directory: "" });
  const listPage1 = await driver.listItems({ itemsPerPage: 1 });
  const listPage2 = await driver.listItems({
    itemsPerPage: 1,
    cursor: listPage1.cursor,
  });
  const listWithUrls = await driver.listItems(
    { itemsPerPage: 10, sortFields: [{ field: "name" }] },
    ["downloadUrl"],
  );

  const deleteResult = await driver.deleteItem(id2);

  let missingIdError: string | undefined;
  try {
    await driver.readItem(undefined as unknown as string);
  } catch (error: any) {
    missingIdError = error?.message ?? String(error);
  }

  return {
    createdIds: [id1, id2],
    readWithUrls: {
      id: readWithUrls.id,
      mimeType: readWithUrls.mimeType,
      sizeInBytes: readWithUrls.sizeInBytes,
      uploadUrl: readWithUrls.uploadUrl,
      downloadUrl: readWithUrls.downloadUrl,
    },
    listPage1Ids: listPage1.items.map((item) => item.id),
    listPage2Ids: listPage2.items.map((item) => item.id),
    listWithUrlsIds: listWithUrls.items.map((item) => item.id),
    listWithUrlsDownloadUrls: listWithUrls.items.map((item) => item.downloadUrl),
    deleteResult,
    missingIdError,
    missingIdErrorExpected: DATA_ITEM_DB_DRIVER_ERRORS.MISSING_ID,
  };
};
