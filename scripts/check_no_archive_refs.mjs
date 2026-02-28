#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.join(__dirname, '..');
const searchDirs = [
  path.join(root, 'context'),
  path.join(root, 'tools', 'agents'),
  path.join(root, 'apps', 'mcp-runtime', 'slate-runtime'),
  path.join(root, 'scripts')
];
const banned = '_archive/';
const offenders = [];
const textExtensions = ['.md', '.yaml', '.yml', '.json', '.ts', '.js', '.mjs', '.ps1', '.sh'];
const scriptPath = fileURLToPath(import.meta.url);

function shouldSkip(fullPath) {
  return fullPath.includes(`${path.sep}node_modules${path.sep}`)
    || fullPath.includes(`${path.sep}dist${path.sep}`)
    || fullPath.includes(`${path.sep}.git${path.sep}`);
}

function scanDir(dir) {
  if (!existsSync(dir)) {
    return;
  }
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (shouldSkip(full)) {
      continue;
    }
    const stats = statSync(full);
    if (stats.isDirectory()) {
      scanDir(full);
    } else if (stats.isFile()) {
      if (full === scriptPath) {
        continue;
      }
      const ext = path.extname(full).toLowerCase();
      if (!textExtensions.includes(ext)) {
        continue;
      }
      const content = readFileSync(full, 'utf8');
      if (content.includes(banned)) {
        offenders.push(full);
      }
    }
  }
}

searchDirs.forEach(scanDir);

if (offenders.length) {
  console.error('Found forbidden _archive references in active code:');
  offenders.forEach((file) => console.error(' -', file));
  process.exit(1);
}

console.log('No _archive references found in active directories.');
