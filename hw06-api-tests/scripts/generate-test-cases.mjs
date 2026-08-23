import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const workspaceDir = path.dirname(projectDir);
const planDir = path.join(workspaceDir, "test-plans");
const outputDir = path.join(workspaceDir, "test-cases");
const dataDir = path.join(projectDir, "postman", "data");

const dataFiles = [
  "fr04-get.json",
  "fr04-put.json",
  "fr09-apply.json",
  "fr17-get.json",
  "fr17-create.json",
  "fr17-delete.json",
];

const automationById = new Map();
for (const fileName of dataFiles) {
  const rows = JSON.parse(fs.readFileSync(path.join(dataDir, fileName), "utf8"));
  for (const row of rows) automationById.set(row.id, row.automationStatus);
}

function classify(technique, input) {
  const text = `${technique} ${input}`.toLowerCase();
  const types = [];
  const add = (type) => {
    if (!types.includes(type)) types.push(type);
  };

  if (/boundary|below min|exact min|above min|lower valid|above boundary|below boundary/.test(text)) add("Boundary");
  if (/state|lifecycle|usage (state|isolation)|double delete/.test(text)) add("State Transition");
  if (/concurrent/.test(text)) add("Concurrency");
  if (/schema|required fields|type enum/.test(text)) add("Schema");
  if (/formula|discount_amount|final_amount/.test(text)) add("Calculation");
  if (/jwt|auth|authorization|scheme|forged|role|ownership|mass assignment|sensitive|sql injection|xss|idor|user id mismatch|user role/.test(text)) add("Security");
  if (/duplicate|uniqueness|isolation|immutable|other coupon|row kh|snapshot/.test(text)) add("Data Integrity");
  if (/missing|null|empty|whitespace|type|array|object|boolean|number|string|unicode|punctuation|multiline|malformed|wrong content|negative|zero|country prefix|hyphen|spaces|first digit|alphabetic|invalid|nonexistent|expired|inactive/.test(text)) add("Equivalence Partitioning");
  if (/^positive| matching| valid |type percent|type fixed|min positive|max uses positive|admin identity partition/.test(text)) add("Positive");
  if (types.length === 0) add("Functional");

  return types.join("; ");
}

function escapeCell(value) {
  return String(value).replaceAll("|", "\\|").replaceAll("\n", "<br>");
}

function readCases(fr) {
  const text = fs.readFileSync(path.join(planDir, `${fr}.md`), "utf8");
  const cases = [];
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\| (FR\d+-TC-\d{3}) \| (.*?) \| (.*?) \| (.*?) \|$/);
    if (!match) continue;
    const [, id, technique, input, expected] = match;
    cases.push({ id, technique, input, expected });
  }
  return cases;
}

function writeSuite(fr) {
  const cases = readCases(fr);
  const lines = [
    `# ${fr} - Test Cases for Human Audit`,
    "",
    `Nguồn: \`test-plans/${fr}.md\`. Type được phân loại tự động để hỗ trợ rà soát; nhãn Audit và Note phải do sinh viên nhập.`,
    "",
    "Giá trị mặc định `PENDING HUMAN AUDIT` không phải kết luận. Sau khi đọc từng case, sinh viên thay bằng `VALID`, `INVALID` hoặc `INCOMPLETE` và ghi lý do trong `Note`.",
    "",
    "| ID | Type | Kỹ thuật / Ref | Input hoặc hành động | Expected result | Audit | Note | Automation | Source |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- |",
  ];

  for (const testCase of cases) {
    const automation = automationById.get(testCase.id) || "unmapped";
    lines.push(
      `| ${testCase.id} | ${escapeCell(classify(testCase.technique, testCase.input))} | ${escapeCell(testCase.technique)} | ${escapeCell(testCase.input)} | ${escapeCell(testCase.expected)} | PENDING HUMAN AUDIT |  | ${automation} | AI-generated |`,
    );
  }

  lines.push("", `Tổng cộng: **${cases.length} test cases**.`);
  fs.writeFileSync(path.join(outputDir, `${fr}.md`), `${lines.join("\n")}\n`, "utf8");
  return cases.length;
}

fs.mkdirSync(outputDir, { recursive: true });
const totals = Object.fromEntries(["FR04", "FR09", "FR17"].map((fr) => [fr, writeSuite(fr)]));

const readme = `# Test Cases for Human Audit

Các file trong thư mục này được tạo từ \`test-plans/\` để sinh viên thực hiện human audit.

| Suite | Số test case | Audit |
| --- | ---: | --- |
${Object.entries(totals).map(([fr, count]) => `| ${fr} | ${count} | PENDING HUMAN AUDIT |`).join("\n")}

## Type

- \`Boundary\`: kiểm tra tại hoặc quanh biên.
- \`Equivalence Partitioning\`: đại diện miền dữ liệu hợp lệ/không hợp lệ.
- \`State Transition\`: kiểm tra trạng thái hoặc lifecycle.
- \`Security\`: authentication, authorization, injection, exposure hoặc escalation.
- \`Schema\`: hình dạng và field của response.
- \`Calculation\`: công thức nghiệp vụ.
- \`Data Integrity\`: uniqueness, isolation hoặc không làm thay đổi dữ liệu ngoài phạm vi.
- \`Concurrency\`: hành vi của request đồng thời.
- \`Positive\` / \`Functional\`: luồng hợp lệ hoặc hành vi chức năng cơ bản.

## Audit workflow

Với từng testcase:

1. Đọc test basis, input và expected result.
2. Thay \`PENDING HUMAN AUDIT\` bằng \`VALID\`, \`INVALID\` hoặc \`INCOMPLETE\`.
3. Ghi lý do, điểm thiếu hoặc nội dung cần sửa trong cột \`Note\`.
4. Không dùng kết quả thực thi Pass/Fail làm nhãn audit thiết kế.

## Execution status

Audit không phải kết quả chạy. Khi tổng hợp báo cáo, bổ sung riêng Actual Result, \`Pass / Fail / Blocked\`, Bug ID và Evidence.
`;

fs.writeFileSync(path.join(outputDir, "README.md"), readme, "utf8");
console.log(`Generated test cases for human audit: ${JSON.stringify(totals)}`);
