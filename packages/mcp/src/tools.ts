import { AntOpsClient } from "@antops/sdk";

const MAX_RESULT_CHARS = 20_000;
const MAX_DOCUMENT_BYTES = 1_000_000;

export const tools = [
  { name: "antops_company_lookup", description: "Look up a normalized official company profile.", inputSchema: { type: "object", properties: { jurisdiction: { type: "string" }, registration_number: { type: "string" }, provider: { type: "string" } }, required: ["jurisdiction", "registration_number"], additionalProperties: false } },
  { name: "antops_domain_check", description: "Run a bounded Email and Domain Health check.", inputSchema: { type: "object", properties: { domain: { type: "string" } }, required: ["domain"], additionalProperties: false } },
  { name: "antops_domain_status", description: "Read the current status of an existing monitored domain asset.", inputSchema: { type: "object", properties: { asset_id: { type: "string" } }, required: ["asset_id"], additionalProperties: false } },
  { name: "antops_tender_search", description: "Search current official procurement opportunities with bounded results.", inputSchema: { type: "object", properties: { keywords: { type: "array", items: { type: "string" }, maxItems: 10 }, jurisdiction: { type: "string" }, page_size: { type: "integer", minimum: 1, maximum: 25 } }, additionalProperties: false } },
  { name: "antops_tender_match", description: "Read explainable matches for an existing saved tender search.", inputSchema: { type: "object", properties: { saved_search_id: { type: "string" } }, required: ["saved_search_id"], additionalProperties: false } },
  { name: "antops_analyze_change", description: "Submit bounded static change text for deterministic AntOps Change Risk analysis.", inputSchema: { type: "object", properties: { files: { type: "array", maxItems: 20, items: { type: "object", properties: { path: { type: "string" }, content: { type: "string", maxLength: 100000 } }, required: ["path", "content"], additionalProperties: false } }, revision: { type: "string" } }, required: ["files"], additionalProperties: false } },
  { name: "antops_document_scan", description: "Upload bounded UTF-8 document text to the existing private document intelligence API.", inputSchema: { type: "object", properties: { name: { type: "string" }, content: { type: "string", maxLength: 1000000 } }, required: ["name", "content"], additionalProperties: false } }
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
    case "antops_analyze_change": {
      const files = Array.isArray(args.files) ? args.files.slice(0, 20).map((file) => ({ path: String((file as Record<string, unknown>).path), content: String((file as Record<string, unknown>).content).slice(0, 100000) })) : [];
      return client.changeRisk.analyze(files, args.revision ? String(args.revision) : undefined);
    }
    case "antops_document_scan": {
      const content = String(args.content);
      if (new TextEncoder().encode(content).byteLength > MAX_DOCUMENT_BYTES) throw new Error("Document text exceeds the MCP safety limit.");
      return client.documents.upload(new Blob([content], { type: "text/plain" }), String(args.name));
    }
    default:
      throw new Error("Unknown AntOps MCP tool.");
  }
}

export function boundedText(value: unknown): string {
  const text = JSON.stringify(value);
  return text.length <= MAX_RESULT_CHARS ? text : `${text.slice(0, MAX_RESULT_CHARS)}...`;
}
