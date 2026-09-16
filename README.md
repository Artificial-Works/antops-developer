# AntOps Developer Tools

Official CLI, Python SDK, TypeScript SDK, GitHub Action and MCP server for the AntOps production
API. These tools are thin clients: AntOps remains the source of truth for all product logic,
scoring, monitoring and policy decisions.

## Quick start

```bash
python -m pip install ./packages/python
export ANTOPS_API_KEY='your workspace key'
antops auth status
antops company lookup GB 00000006 --json
```

Use `ANTOPS_BASE_URL` only for a compatible non-production endpoint. It defaults to
`https://api.antops.dev`. Never commit a key. API documentation is available at
<https://api.antops.dev/docs>.

## Packages

- `packages/python`: `antops` Python client and CLI.
- `packages/typescript`: `@antops/sdk` TypeScript client.
- `actions/change-risk`: reusable GitHub Action for deterministic Change Risk gating.
- `packages/mcp`: `@antops/mcp`, a safe stdio MCP server.

## Security

CLI keys are read from `ANTOPS_API_KEY` or an explicit `antops auth login --stdin` config file.
They are never CLI flags. All clients use timeouts, bound response sizes and omit API keys from
errors. The Action reads a bounded list of static text files and never executes repository content.
MCP tools expose no destructive operation.

The MCP server exposes bounded status/history reads for Change Risk, private documents,
workspace overview and integration configuration. Its only controlled actions are deterministic
Change Risk analysis and a safe domain check. Each MCP request includes only a fixed
allow-listed tool identifier for aggregate platform telemetry; it never forwards prompts, API keys
or tool arguments as telemetry.

## Releases

The Python CLI/SDK, TypeScript SDK and MCP server are prepared for `v0.2.0`. A release tag validates
versions, builds distributable artifacts, tests clean installs, then uses protected PyPI and npm
trusted publishing through GitHub OIDC. No registry package is published until the maintainers finish
that one-time registry configuration and push the matching release tag.

GitHub Change Risk and Slack delivery have controlled production verification. Microsoft Teams is
implemented and test-covered, but is not production-verified and is not represented as such here.
