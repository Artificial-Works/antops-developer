# AntOps Developer Quickstart

## 1. Authenticate

Obtain an AntOps workspace owner or restricted integration key through assisted onboarding. Store
it in a secrets manager and never commit it.

```bash
export ANTOPS_API_KEY='your workspace key'
export ANTOPS_BASE_URL='https://api.antops.dev'
```

## 2. CLI

```bash
python -m pip install 'git+https://github.com/Artificial-Works/antops-developer.git#subdirectory=packages/python'
antops auth status
antops company lookup GB 00000006 --json
antops tender search --keyword cloud --json
```

For config-file use, pipe the key from a password manager into `antops auth login --stdin`. The file
is user-readable only. `antops change-risk analyze Dockerfile compose.yaml` exits `0` when allowed
and `4` when the existing AntOps policy blocks a submitted change.

## 3. SDKs

```python
from antops import AntOpsClient
print(AntOpsClient.from_environment().company.lookup("GB", "00000006"))
```

```ts
import { AntOpsClient } from "@antops/sdk";
const client = new AntOpsClient({ apiKey: process.env.ANTOPS_API_KEY! });
console.log(await client.tenders.search({ keywords: ["cloud"] }));
```

## 4. GitHub Action and MCP

Copy [`examples/change-risk.yml`](../examples/change-risk.yml), add `ANTOPS_API_KEY` as a GitHub
Actions secret, and submit only static text files. The Action has `contents: read` permission and
does not execute submitted content.

Install the published MCP package and configure its command with `ANTOPS_API_KEY` supplied from its
secret manager:

```bash
npm install -g @antops/mcp@0.2.1
```

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

The initial surface is bounded to company lookup, domain check/status, tender search/matches, Change
Risk analysis and private document status/findings. Its only controlled actions are safe domain
checks and deterministic Change Risk analysis; it has no delete, upload, monitor creation, revoke,
rotate, billing or workspace-administration tool.

The MCP status/read surface also covers Change Risk assessment retrieval, private document status
and findings, workspace overview and configured integration status. It remains intentionally unable
to change production monitors, plans, keys or customer data.

## Errors and limits

`401`/`403` means the key is invalid, inactive or lacks a scope. `429` means a request or plan limit
was reached. Use `GET /v1/plans`, `GET /v1/usage` and `GET /v1/workspace/overview` as the source of
truth. Clients use a bounded timeout and reject oversized or non-JSON responses.

## Publication status

`antops==0.2.1`, `@antops/sdk@0.2.1`, and `@antops/mcp@0.2.1` are published. The release used
protected PyPI and npm trusted publishers through GitHub OIDC; no static registry credentials are
kept in this repository. Registry installation is:

```bash
python -m pip install antops==0.2.1
npm install @antops/sdk@0.2.1 @antops/mcp@0.2.1
```

The GitHub Action is version-tagged directly from this repository.
