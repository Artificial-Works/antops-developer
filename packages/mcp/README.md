# AntOps MCP Server

A bounded stdio MCP server for the AntOps production API.

## Install

```bash
npm install @antops/mcp
```

## Configure

```json
{
  "mcpServers": {
    "antops": {
      "command": "antops-mcp",
      "env": { "ANTOPS_API_KEY": "load-from-your-secret-manager" }
    }
  }
}
```

The server exposes bounded company, domain, tender, event, Change Risk and document read/status
tools. Its controlled actions are deterministic Change Risk analysis and a safe domain check. It
does not expose destructive operations, API-key lifecycle, billing or workspace administration.

Keep `ANTOPS_API_KEY` in a secret manager and never commit it. API reference:
<https://api.antops.dev/docs>
