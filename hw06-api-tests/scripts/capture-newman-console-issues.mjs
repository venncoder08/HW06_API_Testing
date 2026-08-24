import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.dirname(scriptDir);
const workspaceDir = path.dirname(projectDir);
const backendDir = path.join(workspaceDir, "eshop-sut", "backend");
const reportDir = path.join(projectDir, "reports", "newman", "console-issues");
const issueDir = path.join(workspaceDir, "issues");
const environmentPath = path.join(projectDir, "postman", "environments", "local.postman_environment.json");
const newmanBin = path.join(projectDir, "node_modules", "newman", "bin", "newman.js");

const sqlite3 = require(path.join(backendDir, "node_modules", "sqlite3")).verbose();
const db = new sqlite3.Database(path.join(backendDir, "database.sqlite"));
db.configure("busyTimeout", 5000);

const seedCoupons = [
  ["SAVE10", "percent", 10, 300000, "2099-12-31", 1, 1],
  ["BIGBUY", "fixed", 50000, 500000, "2099-12-31", 1, 1],
  ["VIP100", "fixed", 100000, 300000, "2099-12-31", 1, 2],
  ["EXPIRED", "percent", 20, 100000, "2020-01-01", 1, 1],
];

const issueCases = [
  {
    issue: 1,
    title: "GET profile exposes password",
    testcaseId: "FR04-TC-009",
    collection: "HW06-FR04.postman_collection.json",
    data: "fr04-get.json",
    folder: "GET Profile - run with fr04-get.json",
  },
  {
    issue: 2,
    title: "PUT profile accepts an invalid short phone",
    testcaseId: "FR04-TC-020",
    collection: "HW06-FR04.postman_collection.json",
    data: "fr04-put.json",
    folder: "PUT Profile - run with fr04-put.json",
  },
  {
    issue: 3,
    title: "Percentage coupon returns incorrect amounts",
    testcaseId: "FR09-TC-001",
    collection: "HW06-FR09.postman_collection.json",
    data: "fr09-apply.json",
    folder: "Apply Coupon - run with fr09-apply.json",
  },
  {
    issue: 4,
    title: "Regular user can list coupons",
    testcaseId: "FR17-TC-003",
    collection: "HW06-FR17.postman_collection.json",
    data: "fr17-get.json",
    folder: "GET Coupons - run with fr17-get.json",
  },
  {
    issue: 5,
    title: "Duplicate coupon code returns HTTP 500",
    testcaseId: "FR17-TC-020",
    collection: "HW06-FR17.postman_collection.json",
    data: "fr17-create.json",
    folder: "CREATE Coupon - run with fr17-create.json",
  },
  {
    issue: 6,
    title: "Regular user can delete a coupon",
    testcaseId: "FR17-TC-078",
    collection: "HW06-FR17.postman_collection.json",
    data: "fr17-delete.json",
    folder: "DELETE Coupon - run with fr17-delete.json",
  },
  {
    issue: 7,
    title: "Basic authorization scheme is accepted",
    testcaseId: "FR04-TC-007",
    collection: "HW06-FR04.postman_collection.json",
    data: "fr04-get.json",
    folder: "GET Profile - run with fr04-get.json",
  },
  {
    issue: 8,
    title: "GET profile exposes reset_token",
    testcaseId: "FR04-TC-010",
    collection: "HW06-FR04.postman_collection.json",
    data: "fr04-get.json",
    folder: "GET Profile - run with fr04-get.json",
  },
];

function runSql(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function callback(error) {
      if (error) reject(error);
      else resolve({ changes: this.changes, lastID: this.lastID });
    });
  });
}

async function resetDatabase() {
  await runSql("DELETE FROM coupon_usage");
  await runSql("DELETE FROM coupons");
  await runSql("DELETE FROM sqlite_sequence WHERE name IN ('coupon_usage', 'coupons')");
  for (const coupon of seedCoupons) {
    await runSql(
      "INSERT INTO coupons (code, type, discount_value, min_order_amount, expired_at, is_active, max_uses_per_user) VALUES (?, ?, ?, ?, ?, ?, ?)",
      coupon,
    );
  }
  await runSql(
    "UPDATE users SET name = ?, role = ?, shipping_address = NULL, phone = NULL WHERE email = ?",
    ["Test User", "user", "test@eshop.com"],
  );
  await runSql(
    "UPDATE users SET name = ?, role = ?, shipping_address = NULL, phone = NULL WHERE email = ?",
    ["Admin User", "admin", "admin@eshop.com"],
  );
}

function stripAnsi(value) {
  return value.replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, "");
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function focusLog(raw) {
  const lines = raw.replaceAll("\r\n", "\n").split("\n");
  if (lines.length <= 115) return lines;
  return [
    `[... ${lines.length - 110} earlier lines retained in the raw .log file ...]`,
    ...lines.slice(-110),
  ];
}

function renderLogLines(lines) {
  return lines.map((line) => {
    const escaped = escapeHtml(line || " ");
    const className = /(failed|failure|assertionerror|expected .* to|500 internal|error:)/i.test(line)
      ? "error"
      : /(X-Student-Id.*23127522|executed|requests|test-scripts|assertions)/i.test(line)
        ? "accent"
        : "";
    return `<span class="${className}">${escaped}</span>`;
  }).join("");
}

function reportName(issueCase, extension) {
  const number = String(issueCase.issue).padStart(2, "0");
  return `issue-${number}-${issueCase.testcaseId}-newman-console.${extension}`;
}

fs.mkdirSync(reportDir, { recursive: true });
fs.mkdirSync(issueDir, { recursive: true });
const manifest = [];

try {
  for (const issueCase of issueCases) {
    await resetDatabase();

    const sourceDataPath = path.join(projectDir, "postman", "data", issueCase.data);
    const sourceRows = JSON.parse(fs.readFileSync(sourceDataPath, "utf8"));
    const testcase = sourceRows.find((row) => row.id === issueCase.testcaseId);
    if (!testcase) throw new Error(`${issueCase.testcaseId} was not found in ${issueCase.data}`);

    const dataPath = path.join(reportDir, reportName(issueCase, "data.json"));
    fs.writeFileSync(dataPath, `${JSON.stringify([testcase], null, 2)}\n`, "utf8");

    const args = [
      newmanBin,
      "run",
      path.join(projectDir, "postman", "collections", issueCase.collection),
      "-e",
      environmentPath,
      "-d",
      dataPath,
      "--folder",
      issueCase.folder,
      "--reporters",
      "cli",
      "--reporter-cli-no-banner",
      "--reporter-cli-no-assertions",
      "--color",
      "off",
      "--timeout-request",
      "10000",
    ];
    const commandDisplay = `node node_modules/newman/bin/newman.js run ... --folder "${issueCase.folder}" -d ${path.basename(dataPath)} --reporters cli`;
    const run = spawnSync(process.execPath, args, {
      cwd: projectDir,
      encoding: "utf8",
      env: { ...process.env, FORCE_COLOR: "0", NO_COLOR: "1" },
      maxBuffer: 10 * 1024 * 1024,
    });
    if (run.error) throw run.error;

    const raw = stripAnsi(`${run.stdout || ""}${run.stderr || ""}`);
    const logPath = path.join(reportDir, reportName(issueCase, "log"));
    fs.writeFileSync(logPath, raw, "utf8");

    const lines = focusLog(raw);
    const htmlPath = path.join(reportDir, reportName(issueCase, "html"));
    const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Issue #${issueCase.issue} Newman Console Evidence</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; padding: 42px; background: #090d10; color: #e9f0ec; font-family: Consolas, "Cascadia Mono", monospace; }
  .terminal { width: 1680px; padding: 34px 38px 40px; border: 1px solid #385047; border-radius: 18px; background: linear-gradient(145deg, #11191d, #090d10); box-shadow: 0 18px 60px rgba(0,0,0,.42); }
  .bar { display: flex; gap: 10px; margin-bottom: 28px; }
  .dot { width: 16px; height: 16px; border-radius: 50%; }
  .red { background: #ff5f57; } .yellow { background: #febc2e; } .green { background: #28c840; }
  h1 { margin: 0 0 12px; color: #ff8e7d; font: 700 30px/1.25 "Segoe UI", sans-serif; }
  .meta { margin-bottom: 22px; padding-bottom: 20px; border-bottom: 1px solid #385047; color: #a9bbb3; font-size: 19px; line-height: 1.55; }
  .meta strong { color: #e9f0ec; }
  .command { margin: 0 0 22px; padding: 14px 18px; background: #17231f; border-left: 5px solid #52c7a1; color: #d5fff1; font-size: 18px; white-space: pre-wrap; }
  pre { margin: 0; font: 18px/1.38 Consolas, "Cascadia Mono", monospace; white-space: pre-wrap; overflow-wrap: anywhere; }
  pre span { display: block; min-height: 1.38em; }
  pre .error { color: #ff8e7d; font-weight: 700; }
  pre .accent { color: #74e5bd; }
</style>
</head>
<body>
<section class="terminal">
  <div class="bar"><span class="dot red"></span><span class="dot yellow"></span><span class="dot green"></span></div>
  <h1>GitHub Issue #${issueCase.issue}: ${escapeHtml(issueCase.title)}</h1>
  <div class="meta"><strong>Testcase:</strong> ${issueCase.testcaseId}<br><strong>Execution:</strong> Newman CLI against http://127.0.0.1:3000<br><strong>Exit code:</strong> ${run.status ?? "unknown"}<br><strong>Generated:</strong> ${new Date().toISOString()}</div>
  <div class="command">PS&gt; ${escapeHtml(commandDisplay)}</div>
  <pre>${renderLogLines(lines)}</pre>
</section>
</body>
</html>`;
    fs.writeFileSync(htmlPath, html, "utf8");

    const pngPath = path.join(issueDir, reportName(issueCase, "png"));
    manifest.push({
      issue: issueCase.issue,
      testcaseId: issueCase.testcaseId,
      title: issueCase.title,
      executionStatus: run.status === 0 ? "PASS" : "FAIL",
      exitCode: run.status,
      logPath,
      htmlPath,
      pngPath,
      viewportHeight: Math.max(1500, Math.min(5600, 420 + lines.length * 27)),
    });
    console.log(`Issue #${issueCase.issue} ${issueCase.testcaseId}: Newman exit ${run.status}`);
  }
} finally {
  await resetDatabase();
  await new Promise((resolve) => db.close(resolve));
}

const manifestPath = path.join(reportDir, "manifest.json");
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(`Created ${manifestPath}`);
