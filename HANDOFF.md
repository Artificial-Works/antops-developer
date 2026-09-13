# AntOps Developer Handoff

Last updated: 2026-09-13

## Wave 6 Delivery

This public repository is the Wave 6 distribution boundary. It contains a Python SDK/CLI,
TypeScript SDK, composite Change Risk GitHub Action and safe stdio MCP server. All tools call the
existing AntOps API and contain no provider, scoring, monitor, policy or document business logic.

### Surface

- CLI: `auth status`, `company lookup/watch`, `domain check/monitor/status`, `tender search`,
  `change-risk analyze` and `document scan`; JSON output is available everywhere and a blocked
  Change Risk decision exits `4`.
- Python and TypeScript SDKs: company lookup/watch, domain check/monitor/status, tender search and
  pagination, Change Risk analysis and document upload.
- Action: sends a maximum of 20 repository-relative static text files, each at most 100 KB, and
  fails only for a platform `blocked` decision.
- MCP: bounded company lookup/watch, domain check/status, tender search/matches, event history,
  Change Risk and document scan. It has no key lifecycle, deletion, billing or administration tool.

### Security and telemetry

Keys are environment/config only and are never positional arguments. CLI config is user-readable
only. The Action uses secrets and minimal `contents: read` permission. MCP uses stdio and never
returns a configured key. SDKs bound timeouts, output and document upload sizes. Platform telemetry
accepts only allow-listed `X-AntOps-Client` versions and records no raw user agent, source content,
document content or key.

### Production proof

Isolated temporary Business workspaces were created and deleted after verifying real production
calls from the CLI, Python SDK, TypeScript SDK, Change Risk Action and MCP server. The MCP stdio
transport listed the tool surface and completed safe Company Watch and Tender Intelligence reads.
The Action submitted a controlled static `compose.yaml` and returned `blocked` with its documented
exit status `1`. Each client produced its expected privacy-safe telemetry identifier:
`cli/0.1.0`, `python/0.1.0`, `typescript/0.1.0`, `github-action/0.1.0` and `mcp/0.1.0`.

### Publication blocker

No PyPI/npm package is published. Configure organization-owned PyPI and npm trusted publishing (or
explicit registry credentials) before enabling release publication. CI/release artifact generation
is ready; automatic publishing remains deliberately absent.

**NEXT ACTION:** Configure package-registry ownership and trusted publishing, then publish the
version-tagged Python, TypeScript and MCP packages. Do not add another product family.
