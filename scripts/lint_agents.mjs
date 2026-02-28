#!/usr/bin/env node
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.join(__dirname, '..');
const agentsDir = path.join(root, 'tools', 'agents');
const disallowed = [/persona/i, /frame\b/i];
let failures = [];

function scan(dir) {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    const stats = statSync(full);
    if (stats.isDirectory()) {
      scan(full);
      continue;
    }
    if (!entry.endsWith('.yaml')) {
      continue;
    }
    if (entry.includes('slate')) {
      continue;
    }
    let text;
    try {
      text = readFileSync(full, 'utf8');
      YAML.parse(text); // throws on invalid syntax
    } catch (error) {
      failures.push(`${full}: YAML parse error - ${error.message}`);
      continue;
    }
    disallowed.forEach((regex) => {
      if (regex.test(text)) {
        failures.push(`${full}: contains disallowed term ${regex}`);
      }
    });
  }
}

scan(agentsDir);

if (failures.length) {
  console.error('Agent lint failures:');
  failures.forEach((msg) => console.error(' -', msg));
  process.exit(1);
}
console.log('All agent manifests linted successfully.');
