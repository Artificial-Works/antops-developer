import { AntOpsClient } from "@antops/sdk";

const MAX_RESULT_CHARS = 20_000;

export const tools = [
  { name: "antops_company_lookup", description: "Look up a normalized official company profile.", inputSchema: { type: "object", properties: { jurisdiction: { type: "string" }, registration_number: { type: "string" }, provider: { type: "string" } }, required: ["jurisdiction", "registration_number"], additionalProperties: false } },
  { name: "antops_domain_check", description: "Run a bounded Email and Domain Health check.", inputSchema: { type: "object", properties: { domain: { type: "string" } }, required: ["domain"], additionalProperties: false } },
  { name: "antops_domain_status", description: "Read the current status of an existing monitored domain asset.", inputSchema: { type: "object", properties: { asset_id: { type: "string" } }, required: ["asset_id"], additionalProperties: false } },
  { name: "antops_tender_search", description: "Search current official procurement opportunities with bounded results.", inputSchema: { type: "object", properties: { keywords: { type: "array", items: { type: "string" }, maxItems: 10 }, jurisdiction: { type: "string" }, page_size: { type: "integer", minimum: 1, maximum: 25 } }, additionalProperties: false } },
  { name: "antops_tender_match", description: "Read explainable matches for an existing saved tender search.", inputSchema: { type: "object", properties: { saved_search_id: { type: "string" } }, required: ["saved_search_id"], additionalProperties: false } },
  { name: "antops_get_events", description: "Read bounded existing company, domain, or tender event history.", inputSchema: { type: "object", properties: { product: { type: "string", enum: ["company", "domain", "tender"] }, jurisdiction: { type: "string" }, registration_number: { type: "string" }, asset_id: { type: "string" }, limit: { type: "integer", minimum: 1, maximum: 25 } }, required: ["product"], additionalProperties: false } },
  { name: "antops_analyze_change", description: "Submit bounded static change text for deterministic AntOps Change Risk analysis.", inputSchema: { type: "object", properties: { files: { type: "array", maxItems: 20, items: { type: "object", properties: { path: { type: "string" }, content: { type: "string", maxLength: 100000 } }, required: ["path", "content"], additionalProperties: false } }, revision: { type: "string" } }, required: ["files"], additionalProperties: false } },
  { name: "antops_change_risk_status", description: "Read a completed Change Risk assessment and its deterministic findings.", inputSchema: { type: "object", properties: { assessment_id: { type: "string" } }, required: ["assessment_id"], additionalProperties: false } },
  { name: "antops_document_status", description: "Read the current private-document processing status.", inputSchema: { type: "object", properties: { document_id: { type: "string" } }, required: ["document_id"], additionalProperties: false } },
  { name: "antops_document_findings", description: "Read bounded findings from an already uploaded private document.", inputSchema: { type: "object", properties: { document_id: { type: "string" } }, required: ["document_id"], additionalProperties: false } },
  { name: "antops_workspace_overview", description: "Read workspace-level asset, event, key and usage summary without modifying configuration.", inputSchema: { type: "object", properties: {}, additionalProperties: false } },
  { name: "antops_integration_status", description: "Read configured Slack, Teams and GitHub integration status without exposing destinations or secrets.", inputSchema: { type: "object", properties: {}, additionalProperties: false } }
] as const;

export async function callTool(client: AntOpsClient, name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case "antops_company_lookup":
      return client.company.lookup(String(args.jurisdiction), String(args.registration_number), args.provider ? String(args.provider) : undefined);
    case "antops_domain_check":
      return client.domains.check(String(args.domain));
    case "antops_domain_status":
      return client.domains.status(String(args.asset_id));
    case "antops_tender_search":
      return client.tenders.search({ keywords: Array.isArray(args.keywords) ? args.keywords.map(String).slice(0, 10) : [], jurisdiction: args.jurisdiction ? String(args.jurisdiction) : undefined, pageSize: Math.min(Number(args.page_size ?? 25), 25) });
    case "antops_tender_match":
      return client.tenders.matches(String(args.saved_search_id));
    case "antops_get_events": {
      const limit = Math.max(1, Math.min(Number(args.limit ?? 25), 25));
      if (args.product === "company") {
        return client.get(
          `/v1/companies/${String(args.jurisdiction)}/${String(args.registration_number)}/events`,
          { limit: String(limit) }
        );
      }
      if (args.product === "domain") {
        return client.get(`/v1/domain-assets/${String(args.asset_id)}/events`, { limit: String(limit) });
      }
      if (args.product === "tender") return client.get("/v1/tender-events", { limit: String(limit) });
      throw new Error("Unsupported event product.");
    }
    case "antops_analyze_change": {
      const files = Array.isArray(args.files) ? args.files.slice(0, 20).map((file) => ({ path: String((file as Record<string, unknown>).path), content: String((file as Record<string, unknown>).content).slice(0, 100000) })) : [];
      return client.changeRisk.analyze(files, args.revision ? String(args.revision) : undefined);
    }
    case "antops_change_risk_status":
      return client.get(`/v1/change-risk/analyses/${String(args.assessment_id)}`);
    case "antops_document_status":
      return client.get(`/v1/documents/${String(args.document_id)}`);
    case "antops_document_findings":
      return client.get(`/v1/documents/${String(args.document_id)}/findings`);
    case "antops_workspace_overview":
      return client.get("/v1/workspace/overview");
    case "antops_integration_status":
      return client.get("/v1/integrations");
    default:
      throw new Error("Unknown AntOps MCP tool.");
  }
}

export function boundedText(value: unknown): string {
  const text = JSON.stringify(value);
  return text.length <= MAX_RESULT_CHARS ? text : `${text.slice(0, MAX_RESULT_CHARS)}...`;
}
