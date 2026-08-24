import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const dataDir = path.join(projectDir, "postman", "data");
const outputDir = path.join(dataDir, "ci");

const suites = [
  {
    source: "fr04-get.json",
    output: "fr04-get-ci.json",
    ids: ["FR04-TC-001", "FR04-TC-003", "FR04-TC-004", "FR04-TC-005", "FR04-TC-006"],
  },
  {
    source: "fr09-apply.json",
    output: "fr09-apply-ci.json",
    ids: ["FR09-TC-002", "FR09-TC-003", "FR09-TC-010"],
  },
  {
    source: "fr17-get.json",
    output: "fr17-get-ci.json",
    ids: ["FR17-TC-001", "FR17-TC-002", "FR17-TC-004", "FR17-TC-005", "FR17-TC-007"],
  },
  {
    source: "fr17-create.json",
    output: "fr17-create-ci.json",
    ids: ["FR17-TC-011", "FR17-TC-012", "FR17-TC-013", "FR17-TC-015"],
  },
  {
    source: "fr17-delete.json",
    output: "fr17-delete-ci.json",
    ids: ["FR17-TC-076", "FR17-TC-077"],
  },
];

fs.mkdirSync(outputDir, { recursive: true });

for (const suite of suites) {
  const source = JSON.parse(fs.readFileSync(path.join(dataDir, suite.source), "utf8"));
  const byId = new Map(source.map((testCase) => [testCase.id, testCase]));
  const selected = suite.ids.map((id) => {
    const testCase = byId.get(id);
    if (!testCase) throw new Error(`${id} was not found in ${suite.source}`);
    return testCase;
  });
  fs.writeFileSync(path.join(outputDir, suite.output), `${JSON.stringify(selected, null, 2)}\n`, "utf8");
  console.log(`${suite.output}: ${selected.length} cases`);
}
