# Workflow Integration Availability

The AntOps platform has prepared GitHub App, Slack and Microsoft Teams integration boundaries, but
they are not publicly available until controlled production-provider verification succeeds.

## GitHub App and GitHub Action

The existing `actions/change-risk` action remains the quickest path for a repository to submit a
bounded static change set to the existing API. It requires only `contents: read` in the calling
workflow and is appropriate where teams want to keep GitHub workflow configuration in the
repository.

The future GitHub App path is complementary. A workspace operator maps an installed App to an
AntOps workspace, enables individual repositories, and GitHub pull-request webhooks trigger a
bounded deterministic Change Risk analysis. The App uses metadata read, pull requests read,
contents read and checks write only. It creates or updates one concise `AntOps Change Risk` Check
Run rather than posting comments. It does not clone repositories or execute repository content.

## Slack and Microsoft Teams

Slack and Teams share the platform's Event -> Alert -> Delivery pipeline. A workspace can route
events by product, severity, customer label, saved search or repository. Destinations are encrypted
at rest and never returned. Deliveries have finite retries and history, and safe test messages run
through the same adapters.

The platform supports Company Watch, Infrastructure Monitoring, Tender Intelligence, Change Risk
and Private Document Intelligence events. Do not configure a production customer until the operator
has completed a controlled provider test and published the integration availability.

## MCP

`@antops/mcp` is a stdio server for safe, bounded AntOps reads and controlled analysis requests. It
does not expose key management, billing, deletion, document deletion or production-monitoring
configuration. Set an environment-only API key and run it after package publication:

```bash
export ANTOPS_API_KEY='your-workspace-key'
npx @antops/mcp
```

Before npm publication, use the documented source-install flow. The MCP server reports only its
fixed tool name and version to platform telemetry; it never reports prompts, arguments, keys or
customer content.
