import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const projectDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const reportDir = path.join(projectDir, "reports", "newman");
const suites = [
  "newman:fr04:get",
  "newman:fr04:put",
  "newman:fr09",
  "newman:fr17:get",
  "newman:fr17:create",
  "newman:fr17:delete",
];

fs.mkdirSync(reportDir, { recursive: true });
const results = [];

for (const suite of suites) {
  console.log(`\n=== Running ${suite} ===`);
  const command = process.platform === "win32" ? "npm.cmd" : "npm";
  const result = spawnSync(command, ["run", suite], {
    cwd: projectDir,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  const exitCode = result.status ?? 1;
  results.push({ suite, exitCode });
}

const summary = [
  "HW06 Newman suite summary",
  `Generated: ${new Date().toISOString()}`,
  "",
  ...results.map(({ suite, exitCode }) => `${suite}: ${exitCode === 0 ? "PASS" : `FAIL (exit ${exitCode})`}`),
  "",
  "See the matching HTML files in this directory for request and assertion details.",
  "",
].join("\n");

fs.writeFileSync(path.join(reportDir, "RUN-SUMMARY.txt"), summary, "utf8");
console.log(`\n${summary}`);
process.exitCode = results.some(({ exitCode }) => exitCode !== 0) ? 1 : 0;
