#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const archiver = require("archiver");
const tar = require("tar");

const OUTPUT_DIR = path.join(__dirname, "archives");

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Create test files to archive
const TEST_FILES_DIR = path.join(OUTPUT_DIR, "test-files");
if (!fs.existsSync(TEST_FILES_DIR)) {
  fs.mkdirSync(TEST_FILES_DIR, { recursive: true });
}

// Create test files
fs.writeFileSync(path.join(TEST_FILES_DIR, "test.txt"), "Hello, World!\n");
fs.writeFileSync(
  path.join(TEST_FILES_DIR, "readme.md"),
  "# Test Archive\n\nThis is a test file for archive testing.\n",
);
fs.writeFileSync(
  path.join(TEST_FILES_DIR, "data.json"),
  JSON.stringify({ test: true, value: 42 }, null, 2),
);

// Create subdirectory with files
const SUB_DIR = path.join(TEST_FILES_DIR, "subfolder");
if (!fs.existsSync(SUB_DIR)) {
  fs.mkdirSync(SUB_DIR);
}
fs.writeFileSync(path.join(SUB_DIR, "nested.txt"), "This is a nested file.\n");

// Copy an image file
const imageSrc = path.join(__dirname, "images", "test.png");
if (fs.existsSync(imageSrc)) {
  fs.copyFileSync(imageSrc, path.join(TEST_FILES_DIR, "image.png"));
}

console.log("Creating test archives...");

// 1. Create ZIP archive
async function createZip() {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(path.join(OUTPUT_DIR, "test.zip"));
    const archive = archiver("zip", { zlib: { level: 9 } });

    output.on("close", () => {
      console.log("✓ Created test.zip");
      resolve();
    });

    archive.on("error", reject);
    archive.pipe(output);
    archive.directory(TEST_FILES_DIR, false);
    archive.finalize();
  });
}

// 2. Create TAR archive
async function createTar() {
  await tar.c(
    {
      file: path.join(OUTPUT_DIR, "test.tar"),
      cwd: TEST_FILES_DIR,
    },
    ["test.txt", "readme.md", "data.json", "subfolder"],
  );
  console.log("✓ Created test.tar");
}

// 3. Create TAR.GZ archive
async function createTarGz() {
  await tar.c(
    {
      file: path.join(OUTPUT_DIR, "test.tar.gz"),
      gzip: true,
      cwd: TEST_FILES_DIR,
    },
    ["test.txt", "readme.md", "data.json", "subfolder"],
  );
  console.log("✓ Created test.tar.gz");
}

// 4. Create TAR.BZ2 archive (if bzip2 is available)
async function createTarBz2() {
  try {
    await tar.c(
      {
        file: path.join(OUTPUT_DIR, "test.tar"),
        cwd: TEST_FILES_DIR,
      },
      ["test.txt", "readme.md", "data.json", "subfolder"],
    );

    execSync(`bzip2 -k "${path.join(OUTPUT_DIR, "test.tar")}"`, {
      stdio: "inherit",
    });
    fs.renameSync(
      path.join(OUTPUT_DIR, "test.tar.bz2"),
      path.join(OUTPUT_DIR, "test.tar.bz2"),
    );
    console.log("✓ Created test.tar.bz2");
  } catch (e) {
    console.log("⚠️  Skipping TAR.BZ2 (bzip2 not available)");
  }
}

// 5. Create empty archive
async function createEmptyZip() {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(path.join(OUTPUT_DIR, "empty.zip"));
    const archive = archiver("zip");

    output.on("close", () => {
      console.log("✓ Created empty.zip");
      resolve();
    });

    archive.on("error", reject);
    archive.pipe(output);
    archive.finalize();
  });
}

// 6. Create large archive with many files
async function createLargeZip() {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(path.join(OUTPUT_DIR, "large.zip"));
    const archive = archiver("zip", { zlib: { level: 1 } });

    output.on("close", () => {
      console.log("✓ Created large.zip");
      resolve();
    });

    archive.on("error", reject);
    archive.pipe(output);

    // Add existing test files
    archive.directory(TEST_FILES_DIR, false);

    // Add many generated files
    for (let i = 0; i < 100; i++) {
      archive.append(`File ${i} content\n`.repeat(10), {
        name: `file${i}.txt`,
      });
    }

    archive.finalize();
  });
}

// Create special format archives description file
function createFormatsInfo() {
  const info = `# Archive Test Fixtures

## Available Archives:
- test.zip - Standard ZIP archive with mixed content
- test.tar - Uncompressed TAR archive
- test.tar.gz - GZIP compressed TAR archive
- test.tar.bz2 - BZIP2 compressed TAR archive (if available)
- empty.zip - Empty ZIP archive
- large.zip - Large ZIP with 100+ files

## For Additional Formats:
The following formats require libarchive-wasm for extraction:
- 7Z, RAR, ISO, CAB, AR, CPIO, XZ, LZMA, GZ, BZ2

These can be created using platform-specific tools or downloaded from test repositories.
`;

  fs.writeFileSync(path.join(OUTPUT_DIR, "README.md"), info);
  console.log("✓ Created README.md");
}

// Main execution
async function main() {
  try {
    await createZip();
    await createTar();
    await createTarGz();
    await createTarBz2();
    await createEmptyZip();
    await createLargeZip();
    createFormatsInfo();

    console.log("\nAll test archives created successfully!");

    // Clean up temporary files
    fs.rmSync(TEST_FILES_DIR, { recursive: true, force: true });
  } catch (error) {
    console.error("Error creating archives:", error);
    process.exit(1);
  }
}

// Check if required modules are installed
try {
  require("archiver");
  require("tar");
} catch (e) {
  console.error("Please install required packages: npm install archiver tar");
  process.exit(1);
}

main();
