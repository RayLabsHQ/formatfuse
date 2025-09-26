export type SingleFileCompressionFormat = "gz" | "bz2" | "xz";

export type ArchiveContainerFormat =
  | "zip"
  | "sevenZip"
  | "rar"
  | "tar"
  | "tarGz"
  | "tarBz2"
  | "tarXz"
  | "tarZst"
  | "iso"
  | "cab"
  | "ar"
  | "cpio"
  | "xar"
  | "lha"
  | "unknown";

export type ArchiveFormat =
  | { kind: "single"; format: SingleFileCompressionFormat }
  | { kind: "archive"; format: ArchiveContainerFormat };

export type ArchiveEngine = "libarchive" | "sevenZip" | "native";

export interface ExtractRequest {
  fileName: string;
  buffer: ArrayBuffer;
  password?: string | null;
}

export interface WorkerArchiveEntry {
  path: string;
  size: number;
  isDirectory: boolean;
  lastModified?: number | null;
  data?: ArrayBuffer;
  compressedSize?: number;
}

export interface ExtractSuccess {
  ok: true;
  entries: WorkerArchiveEntry[];
  engine: ArchiveEngine;
  format: ArchiveFormat;
  warnings: string[];
  encrypted?: boolean;
}

export type ExtractionErrorCode =
  | "PASSWORD_REQUIRED"
  | "UNSUPPORTED_FORMAT"
  | "CORRUPT_ARCHIVE"
  | "EXTRACTION_FAILED";

export interface ExtractFailure {
  ok: false;
  code: ExtractionErrorCode;
  message: string;
  recoverable?: boolean;
  format?: ArchiveFormat;
}

export type ExtractResult = ExtractSuccess | ExtractFailure;

export interface FormatDetectionResult {
  format: ArchiveFormat;
  confidence: number;
  possibleEncrypted?: boolean;
}

export interface ArchiveProbe {
  format: ArchiveFormat;
  size: number;
  fileName: string;
}

export type ArchiveCreateFormat = "zip" | "sevenZip";

export interface CreateArchiveFile {
  path: string;
  data: ArrayBuffer;
  lastModified?: number | null;
}

export interface CreateArchiveRequest {
  format: ArchiveCreateFormat;
  files: CreateArchiveFile[];
  password?: string | null;
  encryptHeaders?: boolean;
}

export interface CreateArchiveSuccess {
  ok: true;
  data: ArrayBuffer;
  format: ArchiveCreateFormat;
  engine: ArchiveEngine;
  warnings: string[];
  passwordProtected: boolean;
}

export interface CreateArchiveFailure {
  ok: false;
  code: "CREATE_FAILED" | "UNSUPPORTED_FORMAT";
  message: string;
  recoverable?: boolean;
}

export type CreateArchiveResult = CreateArchiveSuccess | CreateArchiveFailure;
