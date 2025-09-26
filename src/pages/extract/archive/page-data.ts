import {
  archiveFormats,
  archiveIntentModifiers,
  isArchiveModifierApplicable,
  type ArchiveFormatMeta,
  type ArchiveIntentModifier,
  type SupportedArchiveFormat,
} from "@/data/archiveFormats";

export interface ExampleArchive {
  name: string;
  note: string;
}

const exampleMap: Partial<Record<SupportedArchiveFormat, ExampleArchive>> = {
  zip: { name: "product-assets.zip", note: "Marketing asset bundle" },
  rar: { name: "backup-logs.rar", note: "Weekly server backup" },
  "7z": { name: "firmware-drop.7z", note: "IoT firmware package" },
  tar: { name: "source-code.tar", note: "Source distribution" },
  "tar-gz": { name: "release-v2.1.0.tar.gz", note: "Linux release tarball" },
  "tar-bz2": { name: "archive.tbz2", note: "Legacy build artifacts" },
  "tar-xz": { name: "kernel-modules.txz", note: "Compressed modules" },
  gz: { name: "access.log.2024.gz", note: "Compressed logs" },
  bz2: { name: "dataset.csv.bz2", note: "Analytics dataset" },
  xz: { name: "rootfs.img.xz", note: "Compressed root filesystem" },
  iso: { name: "ubuntu-24.04.iso", note: "OS install image" },
  cab: { name: "driver-update.cab", note: "Windows driver bundle" },
  ar: { name: "sample-package.deb", note: "Debian package" },
  cpio: { name: "initramfs.cpio", note: "Boot image" },
};

export const getExampleArchive = (format: SupportedArchiveFormat): ExampleArchive => {
  const example = exampleMap[format];
  return (
    example ?? {
      name: `${format}-archive`,
      note: "Sample archive",
    }
  );
};

const defaultValueProps = [
  "100% client-side extraction powered by WebAssembly",
  "Preview directories before downloading large payloads",
  "Password prompts appear only when encryption is detected",
  "Works offline once the extractor is loaded",
];

const defaultWorkflow = [
  "Drop your archive into the page or use the file picker.",
  "Warm up the extraction engines for large or encrypted archives.",
  "Preview folders, select what you need, and download instantly.",
];

const defaultPitfalls = [
  "Large archives can consume browser memory—close other heavy tabs if you hit limits.",
  "Encrypted archives still require the original passphrase.",
  "Nested archives must be downloaded and reopened individually.",
];

const defaultUseCases = [
  "Reviewing release packages before pushing to production",
  "Grabbing a single folder from a massive archive",
  "Auditing logs and backups without unzipping locally",
  "Helping non-technical teammates access individual files",
];

export interface ArchivePageContent extends ArchiveIntentModifier["content"] {}

export const buildDefaultContent = (
  format: ArchiveFormatMeta,
): ArchivePageContent => {
  return {
    summary: format.formatSummary,
    valueProps: format.defaultValueProps ?? defaultValueProps,
    workflowSteps: format.defaultWorkflow ?? defaultWorkflow,
    pitfalls: format.defaultPitfalls ?? defaultPitfalls,
    useCases: format.defaultUseCases ?? defaultUseCases,
    faq: [
      {
        question: `Can I preview files inside a ${format.name} archive?`,
        answer:
          "Yes. The extractor renders a browsable file tree so you can inspect folders and download individual files before exporting everything.",
      },
      {
        question: `Does this support password-protected ${format.name} archives?`,
        answer:
          "When encryption is detected, you'll be prompted for the password and the archive will be decrypted entirely in your browser.",
      },
    ],
    seoKeywords: [
      `${format.name.toLowerCase()} extractor`,
      `open ${format.name.toLowerCase()} online`,
      `${format.id} viewer`,
      `extract ${format.id} in browser`,
    ],
    ctaTitle: `Extract ${format.name} archives securely`,
    ctaBody:
      "Run everything inside your browser so sensitive files never leave your device. Download only what you need and keep workflows fast.",
  };
};

export const archiveFormatsList = archiveFormats;
export const archiveModifiersList = archiveIntentModifiers;
export { isArchiveModifierApplicable };
