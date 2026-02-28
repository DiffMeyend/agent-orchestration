export interface KBEntry {
  id: string;
  title: string;
  summary: string;
  body: string;
  category: string;
  tags: string[];
  vendor: string;
  lastUpdated: string;
}

export const KB_ENTRIES: KBEntry[] = [
  {
    id: "secure-endpoints",
    title: "Hardening Vendor API Endpoints",
    summary: "Checklist for enabling TLS mutual auth, rotating keys, and isolating vendor endpoints in MindOS.",
    body: "Enable mTLS for every vendor endpoint. Rotate client certificates every 30 days. Limit firewall rules to vendor CIDR blocks and add rate limiting for burst traffic.",
    category: "security",
    tags: ["security", "api", "network"],
    vendor: "Mindful Cloud",
    lastUpdated: "2026-01-11T09:00:00Z"
  },
  {
    id: "kb-ingestion",
    title: "Knowledge Base Ingestion Playbook",
    summary: "Steps for syncing remote vendor KBs into Slate, including schema normalization and conflict resolution.",
    body: "Use the vendor export endpoint to pull deltas hourly. Normalize Markdown to the Slate schema and preserve vendor IDs for lineage. Conflicts are resolved by preferring the freshest vendor version while storing diffs in history/.",
    category: "operations",
    tags: ["kb", "sync", "operations"],
    vendor: "Acme Support",
    lastUpdated: "2026-01-18T15:30:00Z"
  },
  {
    id: "sla-handoff",
    title: "SLA Handoff Template",
    summary: "Template for capturing SLA constraints when shipping fixes to vendor teams.",
    body: "Record response time thresholds, escalation contacts, and rollback windows. Keep the artifact alongside the DesignSpec and share it with the vendor ops team.",
    category: "process",
    tags: ["sla", "handoff", "template"],
    vendor: "OpsBridge",
    lastUpdated: "2026-01-05T12:10:00Z"
  }
];
