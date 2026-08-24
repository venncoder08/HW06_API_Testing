import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.dirname(scriptDir);
const workspaceDir = path.dirname(projectDir);
const backendDir = path.join(workspaceDir, "eshop-sut", "backend");
const reportDir = path.join(projectDir, "reports", "newman", "prepared");
const baseUrl = "http://127.0.0.1:3000";
const studentId = "23127522";

process.chdir(projectDir);

const newman = require(path.join(projectDir, "node_modules", "newman"));
const sqlite3 = require(path.join(backendDir, "node_modules", "sqlite3")).verbose();
const db = new sqlite3.Database(path.join(backendDir, "database.sqlite"));
db.configure("busyTimeout", 5000);

const seedCoupons = [
  ["SAVE10", "percent", 10, 300000, "2099-12-31", 1, 1],
  ["BIGBUY", "fixed", 50000, 500000, "2099-12-31", 1, 1],
  ["VIP100", "fixed", 100000, 300000, "2099-12-31", 1, 2],
  ["EXPIRED", "percent", 20, 100000, "2020-01-01", 1, 1],
];

const issueUrls = {
  "#5": "https://github.com/venncoder08/HW06_API_Testing/issues/5",
};

function runSql(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function callback(error) {
      if (error) reject(error);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function getSql(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (error, row) => {
      if (error) reject(error);
      else resolve(row);
    });
  });
}

async function resetCoupons() {
  await runSql("DELETE FROM coupon_usage");
  await runSql("DELETE FROM coupons");
  await runSql("DELETE FROM sqlite_sequence WHERE name IN ('coupon_usage', 'coupons')");
  for (const coupon of seedCoupons) {
    await runSql(
      "INSERT INTO coupons (code, type, discount_value, min_order_amount, expired_at, is_active, max_uses_per_user) VALUES (?, ?, ?, ?, ?, ?, ?)",
      coupon,
    );
  }
}

async function userFixture() {
  const user = await getSql("SELECT id FROM users WHERE email = ?", ["test@eshop.com"]);
  const admin = await getSql("SELECT id FROM users WHERE email = ?", ["admin@eshop.com"]);
  if (!user || !admin) throw new Error("Seed user/admin accounts were not found");
  return { userId: user.id, adminId: admin.id };
}

async function couponByCode(code) {
  const coupon = await getSql("SELECT * FROM coupons WHERE code = ?", [code]);
  if (!coupon) throw new Error(`Coupon fixture was not found: ${code}`);
  return coupon;
}

async function setUsage(couponId, userId, count) {
  await runSql("DELETE FROM coupon_usage WHERE coupon_id = ? AND user_id = ?", [couponId, userId]);
  for (let index = 0; index < count; index += 1) {
    await runSql("INSERT INTO coupon_usage (coupon_id, user_id) VALUES (?, ?)", [couponId, userId]);
  }
}

async function ensureBackend() {
  const response = await fetch(`${baseUrl}/api/products`);
  if (!response.ok) throw new Error(`Backend health check returned HTTP ${response.status}`);
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(projectDir, relativePath), "utf8"));
}

function runNewmanCase({ id, dataFile, collectionFile, folder }) {
  const cases = readJson(`postman/data/${dataFile}`);
  const testCase = cases.find((item) => item.id === id);
  if (!testCase) throw new Error(`${id} was not found in ${dataFile}`);

  const htmlName = `${id}.html`;
  const jsonName = `${id}.json`;
  const htmlPath = path.join(reportDir, htmlName);
  const jsonPath = path.join(reportDir, jsonName);

  return new Promise((resolve, reject) => {
    newman.run({
      collection: readJson(`postman/collections/${collectionFile}`),
      environment: readJson("postman/environments/local.postman_environment.json"),
      iterationData: [testCase],
      folder,
      reporters: ["htmlextra", "json"],
      reporter: {
        htmlextra: { export: htmlPath, title: `${id} prepared fixture run` },
        json: { export: jsonPath },
      },
      timeoutRequest: 10000,
    }, (error, summary) => {
      if (error) {
        reject(error);
        return;
      }

      const failures = summary.run.failures.map((failure) => {
        const source = failure.source?.name || failure.at || "Newman";
        return `${source}: ${failure.error?.message || failure.error?.name || "failure"}`;
      });
      resolve({
        id,
        executionStatus: failures.length === 0 ? "PASS" : "FAIL",
        actualResult: failures.length === 0
          ? `Prepared fixture run passed all Newman assertions for ${id}.`
          : `Prepared fixture run failed: ${failures.join(" | ")}`,
        bugId: "",
        evidence: `hw06-api-tests/reports/newman/prepared/${htmlName}; hw06-api-tests/reports/newman/prepared/${jsonName}`,
      });
    });
  });
}

async function api(pathname, { method = "GET", token, body } = {}) {
  const headers = { "X-Student-Id": studentId };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const response = await fetch(`${baseUrl}${pathname}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let parsed;
  try { parsed = JSON.parse(text); } catch { parsed = text; }
  return { status: response.status, body: parsed };
}

async function login(email, password) {
  const response = await api("/api/login", { method: "POST", body: { email, password } });
  if (response.status < 200 || response.status >= 300 || !response.body?.token) {
    throw new Error(`Login failed for ${email}: HTTP ${response.status}`);
  }
  return response.body;
}

async function runStateTransitionCase() {
  await resetCoupons();
  const { userId } = await userFixture();
  const coupon = await couponByCode("VIP100");
  await setUsage(coupon.id, userId, 1);
  const loginResult = await login("test@eshop.com", "Test1234!");
  const applyBody = { code: "VIP100", total_amount: 500000, user_id: userId };
  const first = await api("/api/apply-coupon", { method: "POST", token: loginResult.token, body: applyBody });
  const usage = await api("/api/coupon-usage", {
    method: "POST",
    token: loginResult.token,
    body: { coupon_id: coupon.id },
  });
  const second = await api("/api/apply-coupon", { method: "POST", token: loginResult.token, body: applyBody });
  const usageRow = await getSql(
    "SELECT COUNT(*) AS count FROM coupon_usage WHERE coupon_id = ? AND user_id = ?",
    [coupon.id, userId],
  );
  const passed = first.status >= 200 && first.status < 300
    && first.body?.discount_amount === 100000
    && first.body?.final_amount === 400000
    && usage.status >= 200 && usage.status < 300
    && usageRow.count === 2
    && second.status >= 400 && second.status < 500
    && second.body?.discount_amount === undefined
    && second.body?.final_amount === undefined;

  return {
    id: "FR09-TC-054",
    executionStatus: passed ? "PASS" : "FAIL",
    actualResult: `Prepared usage 1; first apply HTTP ${first.status} (discount=${first.body?.discount_amount}, final=${first.body?.final_amount}); recorded usage HTTP ${usage.status}; database usage=${usageRow.count}; second apply HTTP ${second.status}.`,
    bugId: "",
    evidence: "hw06-api-tests/reports/newman/prepared/PREPARED-CASES-SUMMARY.md; hw06-api-tests/reports/newman/prepared/PREPARED-RESULTS.json",
  };
}

async function runConcurrentCreateCase() {
  await resetCoupons();
  const loginResult = await login("admin@eshop.com", "Admin123!");
  const code = "HW06_FR17_075";
  const body = {
    code,
    type: "percent",
    discount_value: 15,
    min_order_amount: 200000,
    expired_at: "2099-12-31",
    max_uses_per_user: 1,
  };
  const firstPromise = api("/api/admin/coupons", { method: "POST", token: loginResult.token, body });
  const secondPromise = api("/api/admin/coupons", { method: "POST", token: loginResult.token, body });
  const [first, second] = await Promise.all([firstPromise, secondPromise]);
  const countRow = await getSql("SELECT COUNT(*) AS count FROM coupons WHERE code = ?", [code]);
  const statuses = [first.status, second.status];
  const successCount = statuses.filter((status) => status >= 200 && status < 300).length;
  const clientFailureCount = statuses.filter((status) => status >= 400 && status < 500).length;
  const passed = successCount === 1 && clientFailureCount === 1 && countRow.count === 1;
  const bugIds = passed ? [] : ["#5"];
  const evidence = [
    "hw06-api-tests/reports/newman/prepared/PREPARED-CASES-SUMMARY.md",
    "hw06-api-tests/reports/newman/prepared/PREPARED-RESULTS.json",
    ...bugIds.map((bugId) => issueUrls[bugId]),
  ];

  return {
    id: "FR17-TC-075",
    executionStatus: passed ? "PASS" : "FAIL",
    actualResult: `Two concurrent create requests returned HTTP ${first.status} and ${second.status}; database rows with code ${code}=${countRow.count}. Expected one 2xx, one 4xx, and one row.`,
    bugId: bugIds.join(", "),
    evidence: evidence.join("; "),
  };
}

async function runDoubleDeleteCase() {
  await resetCoupons();
  const loginResult = await login("admin@eshop.com", "Admin123!");
  const created = await runSql(
    "INSERT INTO coupons (code, type, discount_value, min_order_amount, expired_at, is_active, max_uses_per_user) VALUES (?, ?, ?, ?, ?, ?, ?)",
    ["HW06_FR17_085", "fixed", 10000, 0, "2099-12-31", 1, 1],
  );
  const first = await api(`/api/admin/coupons/${created.lastID}`, { method: "DELETE", token: loginResult.token });
  const second = await api(`/api/admin/coupons/${created.lastID}`, { method: "DELETE", token: loginResult.token });
  const target = await getSql("SELECT COUNT(*) AS count FROM coupons WHERE id = ?", [created.lastID]);
  const seed = await getSql("SELECT COUNT(*) AS count FROM coupons WHERE code = ?", ["SAVE10"]);
  const passed = first.status >= 200 && first.status < 300
    && second.status < 500
    && target.count === 0
    && seed.count === 1;

  return {
    id: "FR17-TC-085",
    executionStatus: passed ? "PASS" : "FAIL",
    actualResult: `First DELETE HTTP ${first.status}; second DELETE HTTP ${second.status} (exact second status is a specification gap); target rows=${target.count}; SAVE10 rows=${seed.count}.`,
    bugId: "",
    evidence: "hw06-api-tests/reports/newman/prepared/PREPARED-CASES-SUMMARY.md; hw06-api-tests/reports/newman/prepared/PREPARED-RESULTS.json",
  };
}

function writeResults(results) {
  const resultObject = Object.fromEntries(results.map((result) => [result.id, result]));
  const resultPath = path.join(reportDir, "PREPARED-RESULTS.json");
  fs.writeFileSync(resultPath, `${JSON.stringify(resultObject, null, 2)}\n`, "utf8");

  const lines = [
    "# Prepared Fixture and Manual Case Results",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "| Test Case | Status | Actual Result | Bug ID | Evidence |",
    "| --- | --- | --- | --- | --- |",
    ...results.map((result) => `| ${result.id} | ${result.executionStatus} | ${result.actualResult.replaceAll("|", "\\|")} | ${result.bugId || "-"} | ${result.evidence.replaceAll("|", "\\|")} |`),
    "",
  ];
  fs.writeFileSync(path.join(reportDir, "PREPARED-CASES-SUMMARY.md"), lines.join("\n"), "utf8");
}

fs.mkdirSync(reportDir, { recursive: true });
await ensureBackend();
const results = [];

try {
  const { userId, adminId } = await userFixture();

  await resetCoupons();
  await runSql(
    "INSERT INTO coupons (code, type, discount_value, min_order_amount, expired_at, is_active, max_uses_per_user) VALUES (?, ?, ?, ?, ?, ?, ?)",
    ["INACTIVE10", "percent", 10, 0, "2099-12-31", 0, 1],
  );
  results.push(await runNewmanCase({
    id: "FR09-TC-015",
    dataFile: "fr09-apply.json",
    collectionFile: "HW06-FR09.postman_collection.json",
    folder: "Apply Coupon - run with fr09-apply.json",
  }));

  for (const [id, userUsage, adminUsage] of [
    ["FR09-TC-050", 0, 0],
    ["FR09-TC-051", 1, 0],
    ["FR09-TC-052", 2, 0],
    ["FR09-TC-053", 2, 0],
  ]) {
    await resetCoupons();
    const vip = await couponByCode("VIP100");
    await setUsage(vip.id, userId, userUsage);
    await setUsage(vip.id, adminId, adminUsage);
    results.push(await runNewmanCase({
      id,
      dataFile: "fr09-apply.json",
      collectionFile: "HW06-FR09.postman_collection.json",
      folder: "Apply Coupon - run with fr09-apply.json",
    }));
  }

  await runSql("DELETE FROM coupon_usage");
  await runSql("DELETE FROM coupons");
  results.push(await runNewmanCase({
    id: "FR17-TC-010",
    dataFile: "fr17-get.json",
    collectionFile: "HW06-FR17.postman_collection.json",
    folder: "GET Coupons - run with fr17-get.json",
  }));

  results.push(await runStateTransitionCase());
  results.push(await runConcurrentCreateCase());
  results.push(await runDoubleDeleteCase());
  writeResults(results);
} finally {
  await resetCoupons();
  await new Promise((resolve) => db.close(resolve));
}

console.log(JSON.stringify(Object.fromEntries(results.map((result) => [result.id, result])), null, 2));
