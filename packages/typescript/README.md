# AntOps TypeScript SDK

The official TypeScript client for the AntOps production API.

## Install

```bash
npm install @antops/sdk
```

## Use

```ts
import { AntOpsClient } from "@antops/sdk";

const client = new AntOpsClient({ apiKey: process.env.ANTOPS_API_KEY! });
const company = await client.company.lookup("GB", "00000006");
```

The client defaults to `https://api.antops.dev`. Set `ANTOPS_BASE_URL` only for a compatible
non-production endpoint. Keep `ANTOPS_API_KEY` in a secret manager and never commit it.

API reference: <https://api.antops.dev/docs>
