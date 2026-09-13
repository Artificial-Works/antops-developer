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

## Releases

Each publishable package starts at `0.1.0` and follows semantic versioning. CI validates release
artifacts. Publishing is deliberately disabled until PyPI/npm trusted publishing or maintainer-owned
credentials are configured.
