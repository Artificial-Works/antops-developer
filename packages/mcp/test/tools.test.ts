import assert from "node:assert/strict";
import test from "node:test";
import { AntOpsClient } from "@antops/sdk";
import { boundedText, callTool } from "../src/tools.js";

test("MCP tender tool calls the existing SDK and bounds output", async () => {
  const client = new AntOpsClient({ apiKey: "test", fetch: async () => new Response(JSON.stringify({ items: [], page: 1, page_size: 25, total: 0 })) });
  assert.equal((await callTool(client, "antops_tender_search", { keywords: ["cloud"] }) as { total: number }).total, 0);
  assert.ok(boundedText({ value: "x".repeat(21_000) }).endsWith("..."));
});

test("MCP company watch uses the existing SDK rather than local provider logic", async () => {
  const client = new AntOpsClient({
    apiKey: "test",
    fetch: async (input, init) => {
      assert.equal(new URL(String(input)).pathname, "/v1/companies");
      assert.equal(init?.method, "POST");
      return new Response(JSON.stringify({ id: "company-1" }));
    }
  });
  assert.equal((await callTool(client, "antops_company_watch", { jurisdiction: "GB", registration_number: "00000006" }) as { id: string }).id, "company-1");
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
