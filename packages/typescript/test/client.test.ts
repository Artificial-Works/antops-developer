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
      assert.equal(new Headers(init?.headers).get("X-AntOps-Client"), "typescript/0.2.0");
      return new Response(JSON.stringify({ items: [], page: 1, page_size: 25, total: 0 }));
    }
  });
  assert.equal((await client.tenders.search({ keywords: ["cloud", "security"] })).total, 0);
});

test("authentication failures do not expose the key", async () => {
  const client = new AntOpsClient({ apiKey: "secret-key", fetch: async () => new Response(JSON.stringify({ detail: "Missing API key" }), { status: 401 }) });
  await assert.rejects(() => client.get("/v1/workspace"), AuthenticationError);
});

test("tender iterator follows the documented page contract", async () => {
  const requested: string[] = [];
  const client = new AntOpsClient({
    apiKey: "test",
    fetch: async (input) => {
      requested.push(String(input));
      const page = Number(new URL(String(input)).searchParams.get("page"));
      return new Response(JSON.stringify(page === 1
        ? { items: [{ id: "one" }], page: 1, page_size: 1, total: 2 }
        : { items: [{ id: "two" }], page: 2, page_size: 1, total: 2 }));
    }
  });
  const items = [];
  for await (const item of client.tenders.iterSearch({ pageSize: 1 })) items.push(item);
  assert.deepEqual(items, [{ id: "one" }, { id: "two" }]);
  assert.equal(requested.length, 2);
});
