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

Until npm publishing is configured, clone `antops-developer`, run `npm install && npm run build`,
then configure the MCP command as `node /absolute/path/to/packages/mcp/dist/index.js` with
`ANTOPS_API_KEY` supplied from its secret manager.

```json
{
  "mcpServers": {
    "antops": {
      "command": "node",
      "args": ["/absolute/path/to/antops-developer/packages/mcp/dist/index.js"],
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

PyPI and npm packages are not published yet. The only blocker is maintainer-owned PyPI/npm trusted
publisher setup or explicit package-registry credentials. The release workflow validates all three
package versions against the tag, builds artifacts, and can create a GitHub **draft** release only
through explicit manual dispatch. It does not publish automatically. Once maintainers authorize and
publish `v0.1.0`, registry installation is:

```bash
python -m pip install antops==0.1.0
npm install @antops/sdk@0.1.0 @antops/mcp@0.1.0
```

The GitHub Action is version-tagged directly from this repository.
