#!/usr/bin/env node
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.join(__dirname, '..');
const agentsDir = path.join(root, 'tools', 'agents');
let failures = [];

function scan(dir) {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    const stats = statSync(full);
    if (stats.isDirectory()) {
      scan(full);
    } else if (stats.isFile() && entry.endsWith('.yaml')) {
      const text = readFileSync(full, 'utf8');
      if (/persona/i.test(text)) {
        failures.push(full);
      }
    }
  }
}

scan(agentsDir);

if (failures.length) {
  console.error('Found forbidden "persona" references in agent manifests:');
  failures.forEach((file) => console.error(' -', file));
  process.exit(1);
}

console.log('Agent manifests are persona-free.');
