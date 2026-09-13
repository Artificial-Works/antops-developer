#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { AntOpsClient } from "@antops/sdk";
import { boundedText, callTool, tools } from "./tools.js";

const apiKey = process.env.ANTOPS_API_KEY;
if (!apiKey) throw new Error("ANTOPS_API_KEY is required for antops-mcp.");

const client = new AntOpsClient({ apiKey, baseUrl: process.env.ANTOPS_BASE_URL, clientId: "mcp/0.1.0" });
const server = new Server({ name: "antops-mcp", version: "0.1.0" }, { capabilities: { tools: {} } });

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const toolClient = client.withRequestHeaders({ "X-AntOps-MCP-Tool": request.params.name });
    const result = await callTool(toolClient, request.params.name, (request.params.arguments ?? {}) as Record<string, unknown>);
    return { content: [{ type: "text", text: boundedText(result) }] };
  } catch (error) {
    const message = error instanceof Error ? error.message : "AntOps MCP request failed.";
    return { isError: true, content: [{ type: "text", text: message.slice(0, 500) }] };
  }
});

await server.connect(new StdioServerTransport());
