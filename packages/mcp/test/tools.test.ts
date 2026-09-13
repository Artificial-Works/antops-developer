import assert from "node:assert/strict";
import test from "node:test";
import { AntOpsClient } from "@antops/sdk";
import { boundedText, callTool, tools } from "../src/tools.js";

test("MCP tender tool calls the existing SDK and bounds output", async () => {
  const client = new AntOpsClient({ apiKey: "test", fetch: async () => new Response(JSON.stringify({ items: [], page: 1, page_size: 25, total: 0 })) });
  assert.equal((await callTool(client, "antops_tender_search", { keywords: ["cloud"] }) as { total: number }).total, 0);
  assert.ok(boundedText({ value: "x".repeat(21_000) }).endsWith("..."));
});

test("MCP exposes only the two approved controlled actions", () => {
  const controlled = tools.filter((tool) => ["antops_analyze_change", "antops_domain_check"].includes(tool.name));
  assert.equal(controlled.length, 2);
  assert.ok(!tools.some((tool) => tool.name === "antops_company_watch"));
  assert.ok(!tools.some((tool) => tool.name === "antops_document_scan"));
});

test("MCP status tools remain bounded read-only calls", async () => {
  const client = new AntOpsClient({
    apiKey: "test",
    fetch: async (input, init) => {
      assert.equal(new URL(String(input)).pathname, "/v1/change-risk/analyses/assessment-1");
      assert.equal(init?.method, "GET");
      return new Response(JSON.stringify({ id: "assessment-1", decision: "allowed" }));
    }
  });
  const result = await callTool(client, "antops_change_risk_status", { assessment_id: "assessment-1" }) as { decision: string };
  assert.equal(result.decision, "allowed");
});
