import assert from "node:assert/strict";
import test from "node:test";
import { AntOpsClient } from "@antops/sdk";
import { boundedText, callTool } from "../src/tools.js";

test("MCP tender tool calls the existing SDK and bounds output", async () => {
  const client = new AntOpsClient({ apiKey: "test", fetch: async () => new Response(JSON.stringify({ items: [], page: 1, page_size: 25, total: 0 })) });
  assert.equal((await callTool(client, "antops_tender_search", { keywords: ["cloud"] }) as { total: number }).total, 0);
  assert.ok(boundedText({ value: "x".repeat(21_000) }).endsWith("..."));
});
