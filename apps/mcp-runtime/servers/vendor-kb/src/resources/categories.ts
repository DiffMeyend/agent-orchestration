import { getEntriesByCategory, listCategories } from "../data/index.js";
import type { ResourceDescriptor, ResourcePayload } from "./types.js";

export function listCategoryResources(): ResourceDescriptor[] {
  return listCategories().map((category) => ({
    uri: `kb://categories/${category}`,
    name: `Category: ${category}`,
    description: `Vendor KB entries tagged as ${category}`,
    type: "category" as const
  }));
}

export function getCategoryResource(uri: string): ResourcePayload | undefined {
  const match = uri.match(/^kb:\/\/categories\/(?<category>[\w-]+)$/);
  if (!match || !match.groups) {
    return undefined;
  }

  const category = match.groups.category;
  const entries = getEntriesByCategory(category);
  if (entries.length === 0) {
    return undefined;
  }

  const descriptor: ResourceDescriptor = {
    uri,
    name: `Category: ${category}`,
    description: `Vendor KB entries tagged as ${category}`,
    type: "category"
  };

  return {
    descriptor,
    data: {
      category,
      entries
    }
  };
}
