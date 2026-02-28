# Vendor KB MCP Server

> **Status Note:** Backlog and TODOs now live in `/Scratch.md`; this README covers purpose and usage only.

This MCP server exposes a read-only vendor knowledge base so other MindOS processes can search or fetch curated KB entries. It mirrors the Slate runtime JSON-RPC pattern: each request arrives on stdin, responses stream on stdout.

## Purpose
Provide an MCP server that exposes Vendor Knowledge Base data to MindOS hosts. Mirrors the flow documented in `Documentation/mcp_flow.md` and shares glossary definitions from `Documentation/mcp_glossary.md`.

## Planned capabilities
- Tools: `kb.search`, `kb.get`.
- Resources: `kb://entries/<id>` and `kb://categories/<name>` with summaries/metadata.
- Prompts: reusable instructions for citing KB material.

## Getting Started

```bash
cd apps/mcp-runtime
npx ts-node servers/vendor-kb/src/server.ts
```

Or build ahead of time:

```bash
npx nx run apps-mcp-runtime:vendor-kb
node dist/apps/mcp-runtime/servers/vendor-kb/src/server.js
```

The runtime expects newline-delimited JSON-RPC requests. Examples:

```jsonc
{"jsonrpc":"2.0","id":1,"method":"kb.list_tools"}
{"jsonrpc":"2.0","id":2,"method":"kb.search","params":{"query":"SLA","limit":3}}
{"jsonrpc":"2.0","id":3,"method":"kb.get","params":{"id":"secure-endpoints"}}
{"jsonrpc":"2.0","id":4,"method":"kb.list_resources"}
{"jsonrpc":"2.0","id":5,"method":"kb.fetch_resource","params":{"uri":"kb://entries/secure-endpoints"}}
```

Authentication, transport, and real KB ingestion will be layered on later phases. For now the server operates over mock entries defined in `src/data/entries.ts`.
