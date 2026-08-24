import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.dirname(scriptDir);
const workspaceDir = path.dirname(projectDir);
const reportDir = path.join(projectDir, "reports", "newman");
const dataDir = path.join(projectDir, "postman", "data");
const resultPath = path.join(workspaceDir, "test-cases", "audit-overrides.json");
const preparedResultPath = path.join(reportDir, "prepared", "PREPARED-RESULTS.json");

const suites = [
  { feature: "FR04", report: "FR04-GET.html", data: "fr04-get.json" },
  { feature: "FR04", report: "FR04-PUT.html", data: "fr04-put.json" },
  { feature: "FR09", report: "FR09-APPLY.html", data: "fr09-apply.json" },
  { feature: "FR17", report: "FR17-GET.html", data: "fr17-get.json" },
  { feature: "FR17", report: "FR17-CREATE.html", data: "fr17-create.json" },
  { feature: "FR17", report: "FR17-DELETE.html", data: "fr17-delete.json" },
];

const issueUrls = {
  "#1": "https://github.com/venncoder08/HW06_API_Testing/issues/1",
  "#2": "https://github.com/venncoder08/HW06_API_Testing/issues/2",
  "#3": "https://github.com/venncoder08/HW06_API_Testing/issues/3",
  "#4": "https://github.com/venncoder08/HW06_API_Testing/issues/4",
  "#5": "https://github.com/venncoder08/HW06_API_Testing/issues/5",
  "#6": "https://github.com/venncoder08/HW06_API_Testing/issues/6",
  "#7": "https://github.com/venncoder08/HW06_API_Testing/issues/7",
  "#8": "https://github.com/venncoder08/HW06_API_Testing/issues/8",
};

const explicitBugIds = {
  "FR04-TC-007": ["#7"],
  "FR04-TC-009": ["#1"],
  "FR04-TC-010": ["#8"],
  "FR04-TC-020": ["#1", "#2"],
  "FR09-TC-001": ["#3"],
  "FR17-TC-003": ["#4"],
  "FR17-TC-020": ["#5"],
  "FR17-TC-078": ["#6"],
};

const failurePattern = /Iteration\s+(\d+).*?<strong>Failed Test:<\/strong>\s*([^<]+)<\/h5>.*?<pre><code[^>]*>(.*?)<\/code><\/pre>/gs;

function decodeHtml(value) {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, decimal) => String.fromCodePoint(Number.parseInt(decimal, 10)))
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&")
    .replace(/\s+/g, " ")
    .trim();
}

function auditNote(feature, testCase) {
  return `Reviewed against test-plans/${feature}.md. The ${testCase.technique} case is in scope and its expected result is testable against the reviewed requirement/specification.`;
}

function reportEvidence(report, iteration) {
  return `hw06-api-tests/reports/newman/${report} (Iteration ${iteration})`;
}

function blockedReason(testCase, failures) {
  const prefix = testCase.automationStatus === "fixture-required"
    ? "BLOCKED: the required controlled fixture was not prepared, so the Newman verdict is not conclusive."
    : "BLOCKED: this case requires an explicit manual, stateful, or concurrent execution and was not completed by the single-run Newman workflow.";
  const setup = testCase.notes ? ` Required setup: ${testCase.notes}` : "";
  const observed = failures.length > 0
    ? ` Inconclusive Newman observations: ${failures.map(({ name, message }) => `${name}: ${message}`).join(" | ")}`
    : "";
  return `${prefix}${setup}${observed}`;
}

const results = {};

for (const suite of suites) {
  const reportPath = path.join(reportDir, suite.report);
  const dataPath = path.join(dataDir, suite.data);
  const report = fs.readFileSync(reportPath, "utf8");
  const cases = JSON.parse(fs.readFileSync(dataPath, "utf8"));
  const failuresById = new Map();

  for (const match of report.matchAll(failurePattern)) {
    const iteration = Number(match[1]);
    const testCase = cases[iteration - 1];
    if (!testCase) {
      throw new Error(`${suite.report}: iteration ${iteration} is outside ${suite.data}`);
    }

    const failures = failuresById.get(testCase.id) || [];
    failures.push({
      name: decodeHtml(match[2]),
      message: decodeHtml(match[3]),
    });
    failuresById.set(testCase.id, failures);
  }

  for (const [index, testCase] of cases.entries()) {
    const iteration = index + 1;
    const failures = failuresById.get(testCase.id) || [];
    const isBlocked = ["fixture-required", "manual-review"].includes(testCase.automationStatus);
    const executionStatus = isBlocked ? "BLOCKED" : failures.length > 0 ? "FAIL" : "PASS";
    const bugIds = executionStatus === "FAIL"
      ? explicitBugIds[testCase.id] || (suite.report === "FR04-PUT.html" ? ["#1"] : [])
      : [];
    const actualResult = executionStatus === "BLOCKED"
      ? blockedReason(testCase, failures)
      : failures.length > 0
        ? `Newman assertions failed: ${failures.map(({ name, message }) => `${name}: ${message}`).join(" | ")}`
        : `All Newman assertions passed in ${suite.report}.`;
    const evidenceParts = [reportEvidence(suite.report, iteration)];
    for (const bugId of bugIds) evidenceParts.push(issueUrls[bugId]);

    results[testCase.id] = {
      audit: "VALID",
      auditNote: auditNote(suite.feature, testCase),
      actualResult,
      executionStatus,
      bugId: bugIds.join(", "),
      evidence: evidenceParts.join("; "),
    };

  }
}

if (fs.existsSync(preparedResultPath)) {
  const preparedResults = JSON.parse(fs.readFileSync(preparedResultPath, "utf8"));

  for (const [testCaseId, prepared] of Object.entries(preparedResults)) {
    if (!results[testCaseId]) {
      throw new Error(`Prepared result refers to unknown testcase: ${testCaseId}`);
    }

    results[testCaseId] = {
      ...results[testCaseId],
      actualResult: prepared.actualResult,
      executionStatus: prepared.executionStatus,
      bugId: prepared.bugId || "",
      evidence: prepared.evidence,
    };
  }
}

const summary = {};
for (const [testCaseId, result] of Object.entries(results)) {
  const feature = testCaseId.split("-")[0];
  summary[feature] ||= { total: 0, audit: {}, execution: {}, bugs: new Set() };
  const featureSummary = summary[feature];
  featureSummary.total += 1;
  featureSummary.audit[result.audit] = (featureSummary.audit[result.audit] || 0) + 1;
  featureSummary.execution[result.executionStatus] = (featureSummary.execution[result.executionStatus] || 0) + 1;
  for (const bugId of result.bugId.split(",").map((value) => value.trim()).filter(Boolean)) {
    featureSummary.bugs.add(bugId);
  }
}

fs.writeFileSync(resultPath, `${JSON.stringify(results, null, 2)}\n`, "utf8");

const printableSummary = Object.fromEntries(Object.entries(summary).map(([feature, values]) => [
  feature,
  { ...values, bugs: [...values.bugs].sort() },
]));
console.log(JSON.stringify(printableSummary, null, 2));
