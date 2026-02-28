#!/usr/bin/env node
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.join(__dirname, '..');
const schemaPath = path.join(root, 'context', 'schemas', 'context_packet.schema.json');
const packetDirs = [
  path.join(root, 'context', 'context_packets')
];

let schema;
try {
  schema = JSON.parse(readFileSync(schemaPath, 'utf8'));
  delete schema.$schema;
} catch (error) {
  console.error('Failed to load schema:', error.message);
  process.exit(1);
}

let validate;
try {
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  validate = ajv.compile(schema);
} catch (error) {
  console.error('Failed to compile schema:', error.message);
  process.exit(1);
}

function collectJsonFiles(dir, list = []) {
  if (!statSafe(dir)) {
    return list;
  }
  const entries = readdirSync(dir);
  for (const entry of entries) {
    const full = path.join(dir, entry);
    const stats = statSafe(full);
    if (!stats) continue;
    if (stats.isDirectory()) {
      collectJsonFiles(full, list);
    } else if (stats.isFile() && entry.endsWith('.json')) {
      list.push(full);
    }
  }
  return list;
}

function statSafe(target) {
  try {
    return statSync(target);
  } catch {
    return null;
  }
}

function isPacketPath(file) {
  return file.includes(`${path.sep}context_packets${path.sep}`);
}

const files = packetDirs.flatMap((dir) => collectJsonFiles(dir)).filter(isPacketPath);
if (!files.length) {
  console.warn('No context_packet JSON files found to validate.');
  process.exit(0);
}

let failed = false;
for (const file of files) {
  let data;
  try {
    data = JSON.parse(readFileSync(file, 'utf8'));
  } catch (error) {
    console.error(`Failed to parse ${file}: ${error.message}`);
    failed = true;
    continue;
  }
  const valid = validate(data);
  if (!valid) {
    failed = true;
    console.error(`Schema validation failed for ${file}`);
    console.error(validate.errors);
  } else {
    console.log(`OK: ${file}`);
  }
}

process.exit(failed ? 1 : 0);
