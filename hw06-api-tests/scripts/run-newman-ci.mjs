import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const projectDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const reportDir = path.join(projectDir, "reports", "ci");
const environment = "postman/environments/local.postman_environment.json";
const suites = [
  {
    name: "FR04-GET-CI",
    collection: "postman/collections/HW06-FR04.postman_collection.json",
    data: "postman/data/ci/fr04-get-ci.json",
    folder: "GET Profile - run with fr04-get.json",
  },
  {
    name: "FR09-APPLY-CI",
    collection: "postman/collections/HW06-FR09.postman_collection.json",
    data: "postman/data/ci/fr09-apply-ci.json",
  },
  {
    name: "FR17-GET-CI",
    collection: "postman/collections/HW06-FR17.postman_collection.json",
    data: "postman/data/ci/fr17-get-ci.json",
    folder: "GET Coupons - run with fr17-get.json",
  },
  {
    name: "FR17-CREATE-CI",
    collection: "postman/collections/HW06-FR17.postman_collection.json",
    data: "postman/data/ci/fr17-create-ci.json",
    folder: "CREATE Coupon - run with fr17-create.json",
  },
  {
    name: "FR17-DELETE-CI",
    collection: "postman/collections/HW06-FR17.postman_collection.json",
    data: "postman/data/ci/fr17-delete-ci.json",
    folder: "DELETE Coupon - run with fr17-delete.json",
  },
];

fs.mkdirSync(reportDir, { recursive: true });
const newmanCli = path.join(projectDir, "node_modules", "newman", "bin", "newman.js");
const results = [];

for (const suite of suites) {
  const args = [
    "run",
    suite.collection,
    "-e",
    environment,
    "-d",
    suite.data,
    "--reporters",
    "cli,junit,htmlextra",
    "--reporter-junit-export",
    `reports/ci/${suite.name}.xml`,
    "--reporter-htmlextra-export",
    `reports/ci/${suite.name}.html`,
  ];
  if (suite.folder) args.push("--folder", suite.folder);

  console.log(`\n=== Running ${suite.name} ===`);
  const result = spawnSync(process.execPath, [newmanCli, ...args], {
    cwd: projectDir,
    stdio: "inherit",
  });
  results.push({ name: suite.name, exitCode: result.status ?? 1 });
}

const summary = [
  "HW06 GitHub Actions Newman summary",
  `Generated: ${new Date().toISOString()}`,
  "",
  ...results.map(({ name, exitCode }) => `${name}: ${exitCode === 0 ? "PASS" : `FAIL (exit ${exitCode})`}`),
  "",
].join("\n");

fs.writeFileSync(path.join(reportDir, "RUN-SUMMARY.txt"), summary, "utf8");
console.log(`\n${summary}`);
process.exitCode = results.some(({ exitCode }) => exitCode !== 0) ? 1 : 0;
