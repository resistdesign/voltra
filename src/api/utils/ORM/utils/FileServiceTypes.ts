export type BaseFileLocationInfo = {
  directory?: string;
  name: string;
};

export type BaseFile = BaseFileLocationInfo & {
  updatedOn: number;
  mimeType: string;
  sizeInBytes: number;
  isDirectory?: boolean;
  uploadUrl?: string;
  downloadUrl?: string;
};

export type ListFilesResult = {
  files: BaseFile[];
  cursor?: string;
};

export type FileServiceDriver = {
  getFileUploadUrl: (
    file: BaseFileLocationInfo,
    baseDirectory?: string
  ) => Promise<string>;
  getFileDownloadUrl: (
    file: BaseFileLocationInfo,
    baseDirectory?: string
  ) => Promise<string>;
  deleteFile: (
    file: BaseFileLocationInfo,
    baseDirectory?: string
  ) => Promise<void>;
  listFiles: (
    path?: string,
    baseDirectory?: string,
    maxNumberOfFiles?: number,
    cursor?: string
  ) => Promise<ListFilesResult>;
};
