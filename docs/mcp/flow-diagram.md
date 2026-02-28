# MCP Flow – User → Vendor Knowledge Base

```
[User]
   │ prompt / question
   ▼
[MCP Host – AI assistant UI]
   │ routes request to needed capability
   ▼
[MCP Client – Vendor KB adapter inside host]
   │ maintains a single protocol connection
   ▼
[MCP Server – Vendor KB connector process]
   │ authenticates, shapes, and forwards calls
   ▼
[Vendor Knowledge Base – document API]
   │ returns docs / metadata
   ▲
[MCP Server] wraps results into MCP payloads
   ▲
[MCP Client] normalizes for the model
   ▲
[MCP Host] composes final model response
   ▲
[User] sees answer with Vendor KB context
```

## Narrative
1. **User prompt** enters the MCP Host (chat/IDE UI).
2. **Host** decides the question needs Vendor KB context and forwards the request to that client.
3. **Client** translates the intent into MCP calls and hands them to the managed server.
4. **Server** authenticates, talks to the KB/API, and wraps results into tools/resources/prompts.
5. **Client** normalizes the payload for the host/model.
6. **Host** integrates the data and replies with grounded citations.
7. **Primitives:** tools trigger external actions (`vendor_kb.run_*`), resources fetch contextual data (`vendor_kb://...`), prompts share reusable instructions—each follows the same host → client → server loop.

## MindOS-specific mapping
- `/mOS.host`: runs agents/automation and orchestrates clients (agents defined in `docs/agents/handbook.md`; legacy personas are archived).
- `/mOS.client.vendor_kb`: thin host-side adapter, maintains transport.
- `/mOS.server.vendor_kb`: out-of-process connector with creds + policy enforcement.
- `/mOS.resources.vendor_kb.*`: URI space for documents.
- **Auth:** host ↔ client use opaque transport tokens; server stores vendor credentials.
