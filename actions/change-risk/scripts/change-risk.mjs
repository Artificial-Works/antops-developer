import { readFileSync, statSync } from "node:fs";
import { resolve, relative, isAbsolute } from "node:path";

const root = resolve(process.env.GITHUB_WORKSPACE || process.cwd());
const maxFiles = Math.min(Number(process.env.ANTOPS_MAX_FILES || 20), 20);
const maxBytes = Math.min(Number(process.env.ANTOPS_MAX_FILE_BYTES || 100000), 100000);
const paths = (process.env.ANTOPS_FILES || "").split("\n").map((value) => value.trim()).filter(Boolean);
if (!process.env.ANTOPS_API_KEY) throw new Error("ANTOPS_API_KEY is required.");
if (!paths.length || paths.length > maxFiles) throw new Error(`Provide between 1 and ${maxFiles} files.`);

const files = paths.map((path) => {
  if (isAbsolute(path)) throw new Error("Only repository-relative paths are allowed.");
  const resolved = resolve(root, path);
  if (relative(root, resolved).startsWith("..")) throw new Error("Path escapes the repository.");
  const info = statSync(resolved);
  if (!info.isFile() || info.size > maxBytes) throw new Error(`File is not a bounded regular file: ${path}`);
  return { path, content: readFileSync(resolved, "utf8") };
});

const response = await fetch(`${(process.env.ANTOPS_BASE_URL || "https://api.antops.dev").replace(/\/$/, "")}/v1/change-risk/analyses`, {
  method: "POST",
  headers: { "Content-Type": "application/json", "X-API-Key": process.env.ANTOPS_API_KEY, "X-AntOps-Client": "github-action/0.1.0", "User-Agent": "antops-github-action/0.1.0" },
  body: JSON.stringify({ revision: process.env.GITHUB_SHA, files })
});
const result = await response.json().catch(() => ({}));
if (!response.ok) throw new Error(typeof result.detail === "string" ? result.detail : `AntOps returned ${response.status}.`);
console.log(`AntOps: ${result.decision} (${result.risk_level}, score=${result.risk_score})`);
for (const finding of (result.findings || []).slice(0, 50)) console.log(`${finding.severity}: ${finding.path} ${finding.message}`);
if (process.env.GITHUB_STEP_SUMMARY) await import("node:fs/promises").then(({ appendFile }) => appendFile(process.env.GITHUB_STEP_SUMMARY, `## AntOps Change Risk\n\nDecision: **${result.decision}** (${result.risk_level}, score ${result.risk_score})\n`));
if (result.decision === "blocked") process.exitCode = 1;
