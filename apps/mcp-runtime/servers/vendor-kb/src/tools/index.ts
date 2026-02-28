import type { JsonRpcRequest } from "../types.js";
import { GetParamsSchema, runGet } from "./get.js";
import { SearchParamsSchema, runSearch } from "./search.js";

type ToolHandler = (req: JsonRpcRequest) => Promise<any>;

export const toolHandlers: Record<string, ToolHandler> = {
  "kb.search": async (req) => {
    const params = SearchParamsSchema.parse(req.params ?? {});
    return runSearch(params);
  },
  "kb.get": async (req) => {
    const params = GetParamsSchema.parse(req.params ?? {});
    return runGet(params);
  }
};

export function listToolSchemas() {
  return [
    {
      name: "kb.search",
      description: "Search the vendor knowledge base by keyword and optional category.",
      schema: SearchParamsSchema.describe("KB search input schema")
    },
    {
      name: "kb.get",
      description: "Retrieve a specific KB entry by ID.",
      schema: GetParamsSchema.describe("KB get input schema")
    }
  ];
}
