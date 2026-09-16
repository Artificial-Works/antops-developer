# AntOps Developer Handoff

Last updated: 2026-09-16

## Developer Distribution v0.2.0 Preparation

This repository is preparing the `antops` Python CLI/SDK, `@antops/sdk` and `@antops/mcp` packages
for a coordinated `v0.2.0` release. The release workflow validates a pushed version tag, builds each
artifact, tests clean installations, and then publishes through protected PyPI/npm trusted publishers
using GitHub OIDC. Manual dispatch is verification-only and cannot publish packages or create a release.

No package or `v0.2.0` tag exists yet. Registry ownership and protected-environment trusted publisher
configuration remain operator actions; do not use static PyPI or npm tokens.

Current integration availability is deliberately factual: GitHub Change Risk and Slack have controlled
production verification; Microsoft Teams is implemented and test-covered but has not had external
production-provider verification. Public documentation must not present Teams as production verified.

The private platform remains the source of truth. The public clients use bounded API calls and have
production proof for CLI/Python/TypeScript, plus safe MCP read/status operations. They do not embed
provider credentials, monitor logic or billing authority.

**NEXT ACTION:** Configure the protected PyPI and npm trusted publishers, verify control of the
`@antops` npm scope, then create and push the matching `v0.2.0` tag through the normal release gate.

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
- MCP: bounded company lookup, domain check/status, tender search/matches, event history,
  Change Risk findings and document findings. It has no key lifecycle, deletion, billing or
  administration tool.

### Security and telemetry

Keys are environment/config only and are never positional arguments. CLI config is user-readable
only. The Action uses secrets and minimal `contents: read` permission. MCP uses stdio and never
returns a configured key. SDKs bound timeouts, output and document upload sizes. Platform telemetry
accepts only allow-listed `X-AntOps-Client` versions and records no raw user agent, source content,
document content or key.

### Production proof

Isolated temporary Business workspaces were created and deleted after verifying real production
calls from the CLI, Python SDK, TypeScript SDK, Change Risk Action and MCP server. The MCP stdio
transport completed its safe read/status proof against production without exposing credentials.
The Action submitted a controlled static `compose.yaml` and returned `blocked` with its documented
exit status `1`. Each client produced its expected privacy-safe telemetry identifier:
`cli/0.2.0`, `python/0.2.0`, `typescript/0.2.0`, `github-action/0.1.0` and `mcp/0.2.0`.

### Publication blocker

No PyPI/npm package is published. Configure organization-owned PyPI and npm trusted publishing before
creating a release tag. The tag-only workflow will publish only after verification succeeds; manual
workflow dispatch remains artifact verification only.

**NEXT ACTION:** Complete the protected PyPI/npm trusted-publisher setup and scope ownership check,
then create the `v0.2.0` tag. Do not publish before that configuration is complete.
