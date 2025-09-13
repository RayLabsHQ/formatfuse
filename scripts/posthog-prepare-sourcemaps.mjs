#!/usr/bin/env node
import { readdirSync, readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { join, basename } from 'node:path';

const ROOT = process.cwd();
const TARGET_DIR = join(ROOT, 'dist', '_astro');

function listFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const st = statSync(p);
    if (st.isDirectory()) continue; // flat dir for our targets
    out.push(p);
  }
  return out;
}

function fixWorker(filePath) {
  const base = basename(filePath);
  if (!/pdf\.worker.*\.mjs$/i.test(base)) return false;
  const content = readFileSync(filePath, 'utf8');
  const m = content.match(/\/\/\#\s*sourceMappingURL=([^\n\r]+)/);
  const expected = `${base}.map`;
  if (!m) return false;
  const current = m[1].trim();
  const currentPath = join(TARGET_DIR, current);
  const expectedPath = join(TARGET_DIR, expected);

  // If current map path is invalid/missing but expected exists, rewrite
  if (!existsSync(currentPath) && existsSync(expectedPath)) {
    const fixed = content.replace(m[0], `//# sourceMappingURL=${expected}`);
    writeFileSync(filePath, fixed, 'utf8');
    console.log(`[posthog-prepare] Rewrote sourceMappingURL in ${base} -> ${expected}`);
    return true;
  }

  // If neither exists, strip the comment to avoid PostHog CLI failure
  if (!existsSync(currentPath) && !existsSync(expectedPath)) {
    const fixed = content.replace(m[0], '');
    writeFileSync(filePath, fixed, 'utf8');
    console.log(`[posthog-prepare] Removed broken sourceMappingURL in ${base}`);
    return true;
  }

  return false;
}

try {
  const files = listFiles(TARGET_DIR);
  let changes = 0;
  for (const f of files) {
    if (/pdf\.worker.*\.mjs$/i.test(basename(f))) {
      if (fixWorker(f)) changes++;
    }
  }
  console.log(`[posthog-prepare] Completed. Files updated: ${changes}`);
} catch (e) {
  console.error(`[posthog-prepare] Failed:`, e);
  process.exit(1);
}

