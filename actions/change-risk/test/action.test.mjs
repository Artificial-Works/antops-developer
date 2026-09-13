import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

async function runAction(decision) {
  const directory = await mkdtemp(join(tmpdir(), "antops-action-"));
  await writeFile(join(directory, "Dockerfile"), "FROM nginx:latest\n");
  const server = createServer((request, response) => {
    assert.equal(request.headers["x-antops-client"], "github-action/0.1.0");
    response.setHeader("Content-Type", "application/json");
    response.end(JSON.stringify({ decision, risk_level: decision === "blocked" ? "high" : "low", risk_score: 10, findings: [] }));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  const child = spawn(process.execPath, ["scripts/change-risk.mjs"], {
    cwd: new URL("..", import.meta.url).pathname,
    env: { ...process.env, GITHUB_WORKSPACE: directory, ANTOPS_BASE_URL: `http://127.0.0.1:${port}`, ANTOPS_API_KEY: "secret-test-key", ANTOPS_FILES: "Dockerfile" },
    stdio: ["ignore", "pipe", "pipe"]
  });
  let output = "";
  child.stdout.on("data", (value) => { output += value; });
  const code = await new Promise((resolve) => child.on("close", resolve));
  await new Promise((resolve) => server.close(resolve));
  return { code, output };
}

test("action succeeds when AntOps allows the change without printing the secret", async () => {
  const result = await runAction("allowed");
  assert.equal(result.code, 0);
  assert.match(result.output, /AntOps: allowed/);
  assert.doesNotMatch(result.output, /secret-test-key/);
});

test("action fails when AntOps blocks the change", async () => {
  assert.equal((await runAction("blocked")).code, 1);
});
