import assert from "node:assert/strict";
import test from "node:test";
import { AntOpsClient, AuthenticationError } from "../src/index.js";

test("tender search sends repeated query values and safe client telemetry", async () => {
  const client = new AntOpsClient({
    apiKey: "test-key",
    baseUrl: "https://api.example",
    fetch: async (input, init) => {
      const url = new URL(String(input));
      assert.deepEqual(url.searchParams.getAll("keywords"), ["cloud", "security"]);
      assert.equal(new Headers(init?.headers).get("X-AntOps-Client"), "typescript/0.1.0");
      return new Response(JSON.stringify({ items: [], page: 1, page_size: 25, total: 0 }));
    }
  });
  assert.equal((await client.tenders.search({ keywords: ["cloud", "security"] })).total, 0);
});

test("authentication failures do not expose the key", async () => {
  const client = new AntOpsClient({ apiKey: "secret-key", fetch: async () => new Response(JSON.stringify({ detail: "Missing API key" }), { status: 401 }) });
  await assert.rejects(() => client.get("/v1/workspace"), AuthenticationError);
});
