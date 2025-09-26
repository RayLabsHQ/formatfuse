#!/usr/bin/env node
import { readdir, stat } from "node:fs/promises";
import { resolve } from "node:path";

const DIST_DIR = resolve("dist/_astro");

const RULES = [
  {
    label: "7z WASM chunk",
    pattern: /^7zz.*\.wasm$/,
    maxBytes: 2 * 1024 * 1024, // 2 MB
    hint: "7z wasm grew past 2MB; investigate upstream update or enable streaming."
  },
  {
    label: "archive worker chunk",
    pattern: /^archive-extractor\.worker.*\.js$/,
    maxBytes: 120 * 1024, // 120 KB
    hint: "Archive worker bundle exceeded 120KB; check for accidental eager imports."
  }
];

async function main() {
  let entries;
  try {
    entries = await readdir(DIST_DIR);
  } catch (error) {
    console.error(`Bundle check failed: unable to read ${DIST_DIR}. Did you run \`pnpm build\` first?`);
    console.error(error);
    process.exitCode = 1;
    return;
  }

  let hasFailures = false;

  for (const rule of RULES) {
    const matches = entries.filter((file) => rule.pattern.test(file));
    if (matches.length === 0) {
      console.warn(`⚠️  No files matched pattern ${rule.pattern} (${rule.label}).`);
      continue;
    }

    for (const file of matches) {
      const size = (await stat(resolve(DIST_DIR, file))).size;
      if (size > rule.maxBytes) {
        hasFailures = true;
        console.error(`❌ ${rule.label} (${file}) is ${formatBytes(size)}, exceeds limit ${formatBytes(rule.maxBytes)}.`);
        console.error(`   ${rule.hint}`);
      } else {
        console.log(`✅ ${rule.label} (${file}) is ${formatBytes(size)} (limit ${formatBytes(rule.maxBytes)}).`);
      }
    }
  }

  if (hasFailures) {
    process.exitCode = 1;
  } else {
    console.log("Bundle size guardrail passed.");
  }
}

function formatBytes(bytes) {
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

await main();
