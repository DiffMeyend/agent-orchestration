import path from "node:path";
import { promises as fs } from "node:fs";
import matter from "gray-matter";
import yaml from "js-yaml";
import { CollectionSchemas, CollectionName } from "@slate/context-schema";

export function getCollectionDir(name: CollectionName): string {
  return path.join(process.cwd(), "context", name);
}

async function readAllFiles(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const nested = await readAllFiles(fullPath);
      files.push(...nested);
    } else {
      files.push(fullPath);
    }
  }
  return files;
}

export function parseContextFile(raw: string, filename: string): any {
  const ext = path.extname(filename).toLowerCase();
  if (ext === ".yaml" || ext === ".yml") {
    return (yaml.load(raw) ?? {}) as Record<string, unknown>;
  }
  if (ext === ".md" || ext === ".markdown") {
    const parsed = matter(raw);
    return parsed.data ?? {};
  }
  if (ext === ".json") {
    return JSON.parse(raw);
  }
  return raw;
}

export async function loadCollection<T>(name: CollectionName): Promise<T[]> {
  const schema = CollectionSchemas[name];
  const dir = getCollectionDir(name);
  const files = await readAllFiles(dir);
  const entries: T[] = [];

  for (const file of files) {
    if (!file.match(/\.(ya?ml|md|markdown|json)$/i)) {
      continue;
    }
    const raw = await fs.readFile(file, "utf-8");
    const parsed = parseContextFile(raw, file);
    const result = schema.safeParse(parsed);
    if (!result.success) {
      throw new Error(`Invalid ${name} entry in ${file}: ${result.error.message}`);
    }
    entries.push(result.data as T);
  }

  return entries;
}

export async function validateAll(strict: boolean): Promise<void> {
  for (const name of Object.keys(CollectionSchemas) as CollectionName[]) {
    try {
      await loadCollection(name);
    } catch (error) {
      if (strict) {
        throw error;
      }
      console.warn(`[context] Validation warning for collection "${name}":`, error);
    }
  }
}
