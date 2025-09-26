import type { ArchiveFormat, ArchiveContainerFormat, FormatDetectionResult } from "./types";

const SIGNATURES = {
  zip: [0x50, 0x4b, 0x03, 0x04],
  zipSpanned: [0x50, 0x4b, 0x07, 0x08],
  gzip: [0x1f, 0x8b],
  bz2: [0x42, 0x5a, 0x68],
  xz: [0xfd, 0x37, 0x7a, 0x58, 0x5a, 0x00],
  sevenZip: [0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c],
  rar4: [0x52, 0x61, 0x72, 0x21, 0x1a, 0x07, 0x00],
  rar5: [0x52, 0x61, 0x72, 0x21, 0x1a, 0x07, 0x01, 0x00],
  cab: [0x4d, 0x53, 0x43, 0x46], // MSCF
  xar: [0x78, 0x61, 0x72, 0x21],
};

const ISO_OFFSETS = [0x8001, 0x8801, 0x9001];
const ISO_MAGIC = [0x43, 0x44, 0x30, 0x30, 0x31]; // "CD001"

const LHA_SIGNATURE = [0x2d, 0x68, 0x6c, 0x30]; // "-hl0" etc

const TAR_KNOWN_EXTENSIONS = [
  ".tar",
  ".tar.gz",
  ".tgz",
  ".tar.bz2",
  ".tbz",
  ".tbz2",
  ".tar.xz",
  ".txz",
  ".tar.z",
];

const SINGLE_FILE_EXTENSIONS = [
  ".gz",
  ".bz2",
  ".xz",
];

function hasSignature(buffer: Uint8Array, signature: number[], offset = 0): boolean {
  if (buffer.length < offset + signature.length) return false;
  for (let i = 0; i < signature.length; i += 1) {
    if (buffer[offset + i] !== signature[i]) {
      return false;
    }
  }
  return true;
}

function detectIso(buffer: Uint8Array): boolean {
  if (buffer.length < Math.max(...ISO_OFFSETS) + ISO_MAGIC.length) {
    return false;
  }
  return ISO_OFFSETS.some((offset) => hasSignature(buffer, ISO_MAGIC, offset));
}

function extensionOf(fileName: string): string {
  const lower = fileName.toLowerCase();
  const lastDot = lower.lastIndexOf(".");
  if (lastDot === -1) return "";
  return lower.slice(lastDot);
}

function matchesAnyExtension(fileName: string, extensions: string[]): boolean {
  const lower = fileName.toLowerCase();
  return extensions.some((ext) => lower.endsWith(ext));
}

function stripCompressionExtensions(fileName: string): string {
  const lower = fileName.toLowerCase();
  const map: Record<string, number> = {
    ".tar.gz": 7,
    ".tar.bz2": 8,
    ".tar.xz": 7,
    ".tar.z": 6,
    ".tgz": 4,
    ".tbz": 4,
    ".tbz2": 5,
    ".txz": 4,
    ".gz": 3,
    ".bz2": 4,
    ".xz": 3,
  };
  for (const [suffix, length] of Object.entries(map)) {
    if (lower.endsWith(suffix)) {
      return fileName.slice(0, fileName.length - length);
    }
  }
  return fileName;
}

export function inferOutputName(fileName: string): string {
  const stripped = stripCompressionExtensions(fileName);
  return stripped === fileName ? `${fileName}.out` : stripped;
}

function formatFromExtension(fileName: string): ArchiveFormat | null {
  const lower = fileName.toLowerCase();

  if (lower.endsWith(".tar.gz") || lower.endsWith(".tgz")) {
    return { kind: "archive", format: "tarGz" };
  }
  if (lower.endsWith(".tar.bz2") || lower.endsWith(".tbz") || lower.endsWith(".tbz2")) {
    return { kind: "archive", format: "tarBz2" };
  }
  if (lower.endsWith(".tar.xz") || lower.endsWith(".txz")) {
    return { kind: "archive", format: "tarXz" };
  }
  if (lower.endsWith(".tar")) {
    return { kind: "archive", format: "tar" };
  }
  if (lower.endsWith(".zip")) {
    return { kind: "archive", format: "zip" };
  }
  if (lower.endsWith(".7z")) {
    return { kind: "archive", format: "sevenZip" };
  }
  if (lower.endsWith(".rar")) {
    return { kind: "archive", format: "rar" };
  }
  if (lower.endsWith(".iso")) {
    return { kind: "archive", format: "iso" };
  }
  if (lower.endsWith(".cab")) {
    return { kind: "archive", format: "cab" };
  }
  if (lower.endsWith(".xz")) {
    return { kind: "single", format: "xz" };
  }
  if (lower.endsWith(".bz2")) {
    return { kind: "single", format: "bz2" };
  }
  if (lower.endsWith(".gz")) {
    return { kind: "single", format: "gz" };
  }
  if (lower.endsWith(".cpio")) {
    return { kind: "archive", format: "cpio" };
  }
  if (lower.endsWith(".xar")) {
    return { kind: "archive", format: "xar" };
  }
  if (lower.endsWith(".lha") || lower.endsWith(".lzh")) {
    return { kind: "archive", format: "lha" };
  }
  return null;
}

function formatFromSignature(buffer: Uint8Array): ArchiveFormat | null {
  if (hasSignature(buffer, SIGNATURES.zip) || hasSignature(buffer, SIGNATURES.zipSpanned)) {
    return { kind: "archive", format: "zip" };
  }
  if (hasSignature(buffer, SIGNATURES.sevenZip)) {
    return { kind: "archive", format: "sevenZip" };
  }
  if (hasSignature(buffer, SIGNATURES.rar4) || hasSignature(buffer, SIGNATURES.rar5)) {
    return { kind: "archive", format: "rar" };
  }
  if (hasSignature(buffer, SIGNATURES.cab)) {
    return { kind: "archive", format: "cab" };
  }
  if (hasSignature(buffer, SIGNATURES.xar)) {
    return { kind: "archive", format: "xar" };
  }
  if (hasSignature(buffer, SIGNATURES.gzip)) {
    return { kind: "single", format: "gz" };
  }
  if (hasSignature(buffer, SIGNATURES.bz2)) {
    return { kind: "single", format: "bz2" };
  }
  if (hasSignature(buffer, SIGNATURES.xz)) {
    return { kind: "single", format: "xz" };
  }
  if (detectIso(buffer)) {
    return { kind: "archive", format: "iso" };
  }
  if (hasSignature(buffer, LHA_SIGNATURE)) {
    return { kind: "archive", format: "lha" };
  }
  return null;
}

function downgradeSingleIfTar(fileName: string, format: ArchiveFormat): ArchiveFormat {
  if (format.kind === "single" && matchesAnyExtension(fileName, TAR_KNOWN_EXTENSIONS)) {
    // `.tar.gz` etc should be treated as archives even if signature matches gz
    const lower = fileName.toLowerCase();
    if (lower.endsWith(".tar.gz") || lower.endsWith(".tgz")) {
      return { kind: "archive", format: "tarGz" };
    }
    if (lower.endsWith(".tar.bz2") || lower.endsWith(".tbz") || lower.endsWith(".tbz2")) {
      return { kind: "archive", format: "tarBz2" };
    }
    if (lower.endsWith(".tar.xz") || lower.endsWith(".txz")) {
      return { kind: "archive", format: "tarXz" };
    }
    if (lower.endsWith(".tar")) {
      return { kind: "archive", format: "tar" };
    }
  }
  return format;
}

export function detectArchiveFormat(
  buffer: Uint8Array,
  fileName: string,
): FormatDetectionResult {
  const bySignature = formatFromSignature(buffer);
  const byExtension = formatFromExtension(fileName);

  if (bySignature && byExtension) {
    const resolved = downgradeSingleIfTar(fileName, bySignature);
    const confidence = resolved.format === byExtension.format ? 1 : 0.8;
    return { format: resolved, confidence };
  }

  if (bySignature) {
    return { format: downgradeSingleIfTar(fileName, bySignature), confidence: 0.9 };
  }

  if (byExtension) {
    return { format: byExtension, confidence: 0.6 };
  }

  return { format: { kind: "archive", format: "unknown" }, confidence: 0 };
}

export function isSingleFileCompression(format: ArchiveFormat): boolean {
  return format.kind === "single";
}

export function shouldTryLibarchiveFirst(format: ArchiveFormat): boolean {
  if (format.kind === "single") {
    return false;
  }
  const libarchiveFriendly: ArchiveContainerFormat[] = [
    "zip",
    "tar",
    "tarGz",
    "tarBz2",
    "tarXz",
    "cab",
    "cpio",
    "xar",
    "ar",
  ];
  return libarchiveFriendly.includes(format.format);
}

export function formatToDisplayName(format: ArchiveFormat): string {
  if (format.kind === "single") {
    return format.format.toUpperCase();
  }
  switch (format.format) {
    case "sevenZip":
      return "7z";
    case "tarGz":
      return "TAR.GZ";
    case "tarBz2":
      return "TAR.BZ2";
    case "tarXz":
      return "TAR.XZ";
    default:
      return format.format.toUpperCase();
  }
}

