# MCP Glossary (MindOS)

Derived from Context-Engineering components (Model Context Protocol – Glossary.md). This copy stays in-repo so connectors and Slate can reference it locally.

## Roles

### MCP Host
The AI application/environment that houses the language model and orchestrates interactions with external systems. Coordinates one or more MCP client connections and presents the user-facing interface (chat, IDE, etc.).

### MCP Client
Lives inside the host and maintains a dedicated connection to an MCP server. Translates structured requests from the model into protocol calls and normalizes server responses. Each client manages exactly one server connection.

### MCP Server
External program/service exposing data or capabilities to the model. Connects to file stores, databases, or APIs, executes requests, and returns model-friendly results. Hosts can talk to multiple servers concurrently.

**Comparison:** Traditional API integrations are single client-server; MCP introduces a coordinating host (similar to LSP). Because MCP is open, any compliant host can talk to any compliant server.

## Resource Types (Primitives)

### Tool
Active capability exposed by a server (API call, computation, automation trigger). Each tool has a schema and name so clients know how to call it and validate inputs/outputs.

### Resource
Read-oriented contextual data (files, documents, DB rows). Identified by URIs with metadata (name, type, summary). Clients can list/fetch resources and subscribe to changes.

### Prompt
Structured interaction template with defined roles/content/placeholders. Servers expose prompts so hosts can list/fetch and inject them into model conversations.

**Comparison:** MCP formalizes vendor-agnostic tools/resources/prompts. Function calling APIs were vendor-specific; MCP discovery happens at runtime and is model-agnostic.
