import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../../..", import.meta.url);

test("the documented Change Risk Action uses the repository release version", async () => {
  const [manifest, example] = await Promise.all([
    readFile(new URL("package.json", root), "utf8"),
    readFile(new URL("examples/change-risk.yml", root), "utf8"),
  ]);
  const version = JSON.parse(manifest).version;

  assert.match(version, /^\d+\.\d+\.\d+$/);
  assert.match(example, new RegExp(`Artificial-Works/antops-developer/actions/change-risk@v${version}`));
  assert.match(example, /contents: read/);
  assert.match(example, /secrets\.ANTOPS_API_KEY/);
  assert.doesNotMatch(example, /api-key:\s+(?!\$\{\{ secrets\.ANTOPS_API_KEY \}\})\S+/);
});
