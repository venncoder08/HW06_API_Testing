import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const workspaceDir = path.dirname(projectDir);
const roots = [
  path.join(projectDir, "postman", "collections"),
  path.join(projectDir, "postman", "environments"),
  path.join(projectDir, "postman", "data"),
];

let count = 0;
let scriptCount = 0;

function validateScripts(node, fileName, trail = []) {
  for (const itemEvent of node.event || []) {
    const source = Array.isArray(itemEvent.script?.exec)
      ? itemEvent.script.exec.join("\n")
      : String(itemEvent.script?.exec || "");

    try {
      new Function(source);
    } catch (error) {
      const location = trail.length ? trail.join(" > ") : "collection";
      throw new Error(`${fileName}: invalid ${itemEvent.listen} script at ${location}: ${error.message}`);
    }
    scriptCount += 1;
  }

  for (const item of node.item || []) {
    validateScripts(item, fileName, [...trail, item.name || "unnamed item"]);
  }
}

for (const root of roots) {
  for (const name of fs.readdirSync(root)) {
    if (!name.endsWith(".json")) continue;
    const parsed = JSON.parse(fs.readFileSync(path.join(root, name), "utf8"));
    if (root === roots[0]) validateScripts(parsed, name);
    count += 1;
  }
}

function planIds(fileName, prefix) {
  const text = fs.readFileSync(path.join(workspaceDir, "test-plans", fileName), "utf8");
  return [...text.matchAll(new RegExp(`\\| (${prefix}-TC-\\d{3}) \\|`, "g"))].map((match) => match[1]);
}

function dataRows(fileName) {
  return JSON.parse(fs.readFileSync(path.join(projectDir, "postman", "data", fileName), "utf8"));
}

const coverage = {
  FR04: [...dataRows("fr04-get.json"), ...dataRows("fr04-put.json")],
  FR09: dataRows("fr09-apply.json"),
  FR17: [...dataRows("fr17-get.json"), ...dataRows("fr17-create.json"), ...dataRows("fr17-delete.json")],
};

for (const [fr, rows] of Object.entries(coverage)) {
  const planned = planIds(`${fr}.md`, fr).sort();
  const generated = rows.map((row) => row.id).sort();
  if (JSON.stringify(planned) !== JSON.stringify(generated)) {
    throw new Error(`${fr} generated IDs do not exactly match the test plan`);
  }

  const statusCounts = rows.reduce((result, row) => {
    result[row.automationStatus] = (result[row.automationStatus] || 0) + 1;
    return result;
  }, {});
  console.log(`${fr}: ${rows.length} rows, statuses ${JSON.stringify(statusCounts)}`);
}

console.log(`Parsed ${count} JSON files, compiled ${scriptCount} Postman scripts and verified plan/data ID coverage.`);
console.log("No API or Newman execution was performed.");
