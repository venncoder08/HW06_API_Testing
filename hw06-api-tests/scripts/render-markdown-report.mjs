import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceDir = path.resolve(scriptDir, "..", "..");
const inputPath = path.resolve(workspaceDir, process.argv[2] || "docs/23127522_HW06_AI_API_Main_Report.md");
const outputPath = path.resolve(
  workspaceDir,
  process.argv[3] || inputPath.replace(/\.md$/i, ".html"),
);

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function slugify(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function inline(value) {
  let result = escapeHtml(value);
  result = result.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<figure><img src="$2" alt="$1"><figcaption>$1</figcaption></figure>');
  result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  result = result.replace(/`([^`]+)`/g, "<code>$1</code>");
  result = result.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  result = result.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  return result;
}

function splitTableRow(line) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function isTableSeparator(line) {
  return splitTableRow(line).every((cell) => /^:?-{3,}:?$/.test(cell));
}

function renderMarkdown(markdown) {
  const lines = markdown.replaceAll("\r\n", "\n").split("\n");
  const output = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (!line.trim()) {
      index += 1;
      continue;
    }

    if (line.startsWith("```")) {
      const language = line.slice(3).trim();
      const code = [];
      index += 1;
      while (index < lines.length && !lines[index].startsWith("```")) {
        code.push(lines[index]);
        index += 1;
      }
      index += 1;
      output.push(`<pre><code class="language-${escapeHtml(language)}">${escapeHtml(code.join("\n"))}</code></pre>`);
      continue;
    }

    const heading = /^(#{1,6})\s+(.+)$/.exec(line);
    if (heading) {
      const level = heading[1].length;
      const text = heading[2].trim();
      output.push(`<h${level} id="${slugify(text)}">${inline(text)}</h${level}>`);
      index += 1;
      continue;
    }

    if (/^---+$/.test(line.trim())) {
      output.push("<hr>");
      index += 1;
      continue;
    }

    if (line.trim().startsWith("|") && index + 1 < lines.length && isTableSeparator(lines[index + 1])) {
      const headers = splitTableRow(line);
      index += 2;
      const rows = [];
      while (index < lines.length && lines[index].trim().startsWith("|")) {
        rows.push(splitTableRow(lines[index]));
        index += 1;
      }
      output.push("<table><thead><tr>");
      for (const header of headers) output.push(`<th>${inline(header)}</th>`);
      output.push("</tr></thead><tbody>");
      for (const row of rows) {
        output.push("<tr>");
        for (const cell of row) output.push(`<td>${inline(cell)}</td>`);
        output.push("</tr>");
      }
      output.push("</tbody></table>");
      continue;
    }

    if (/^-\s+/.test(line)) {
      output.push("<ul>");
      while (index < lines.length && /^-\s+/.test(lines[index])) {
        output.push(`<li>${inline(lines[index].replace(/^-\s+/, ""))}</li>`);
        index += 1;
      }
      output.push("</ul>");
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      output.push("<ol>");
      while (index < lines.length && /^\d+\.\s+/.test(lines[index])) {
        output.push(`<li>${inline(lines[index].replace(/^\d+\.\s+/, ""))}</li>`);
        index += 1;
      }
      output.push("</ol>");
      continue;
    }

    const paragraph = [];
    while (index < lines.length) {
      const candidate = lines[index];
      if (!candidate.trim()) break;
      if (
        candidate.startsWith("```")
        || /^(#{1,6})\s+/.test(candidate)
        || /^---+$/.test(candidate.trim())
        || /^-\s+/.test(candidate)
        || /^\d+\.\s+/.test(candidate)
        || (candidate.trim().startsWith("|") && index + 1 < lines.length && isTableSeparator(lines[index + 1]))
      ) break;
      paragraph.push(candidate.endsWith("  ") ? `${candidate.trimEnd()}<br>` : candidate.trim());
      index += 1;
    }
    output.push(`<p>${inline(paragraph.join(" ")).replaceAll("&lt;br&gt;", "<br>")}</p>`);
  }

  return output.join("\n");
}

const markdown = fs.readFileSync(inputPath, "utf8");
const body = renderMarkdown(markdown);
const title = markdown.match(/^#\s+(.+)$/m)?.[1]?.trim() || path.basename(inputPath, path.extname(inputPath));
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>
  @page { size: A4; margin: 17mm 15mm 18mm; }
  :root { --ink: #172126; --accent: #0c6b58; --accent-soft: #dcefe9; --line: #b9c8c3; --paper: #fffef9; }
  * { box-sizing: border-box; }
  body { max-width: 980px; margin: 0 auto; padding: 42px 54px 72px; background: var(--paper); color: var(--ink); font: 15px/1.58 Georgia, "Times New Roman", serif; }
  h1, h2, h3, h4 { color: #173f36; font-family: "Aptos Display", "Segoe UI", sans-serif; line-height: 1.2; }
  h1 { margin: 0 0 24px; padding-bottom: 16px; border-bottom: 5px solid var(--accent); font-size: 34px; }
  h2 { margin-top: 48px; padding: 9px 13px; background: linear-gradient(90deg, var(--accent-soft), transparent); border-left: 6px solid var(--accent); font-size: 25px; break-before: page; }
  h3 { margin-top: 27px; font-size: 19px; }
  h4 { margin-top: 22px; font-size: 16px; }
  p { margin: 10px 0; text-align: justify; }
  a { color: #075e92; text-decoration: none; overflow-wrap: anywhere; }
  code { padding: 1px 5px; border-radius: 4px; background: #edf3f1; font: 0.9em Consolas, monospace; }
  pre { overflow-wrap: anywhere; white-space: pre-wrap; padding: 14px 16px; border-left: 4px solid var(--accent); background: #172126; color: #f5f7f4; break-inside: avoid; }
  pre code { padding: 0; background: transparent; color: inherit; }
  table { width: 100%; margin: 16px 0 22px; border-collapse: collapse; font-size: 13px; break-inside: auto; }
  th, td { padding: 8px 9px; border: 1px solid var(--line); vertical-align: top; }
  th { background: #245f50; color: white; font-family: "Segoe UI", sans-serif; text-align: left; }
  tr:nth-child(even) td { background: #f2f7f5; }
  tr { break-inside: avoid; }
  ul, ol { padding-left: 25px; }
  li { margin: 4px 0; }
  figure { margin: 18px auto 25px; text-align: center; break-inside: avoid; }
  figure img { max-width: 100%; max-height: 690px; border: 1px solid var(--line); box-shadow: 0 3px 12px rgba(20, 45, 37, 0.13); }
  figcaption { margin-top: 7px; color: #4f625d; font: italic 12px Georgia, serif; }
  hr { margin: 26px 0; border: 0; border-top: 1px solid var(--line); }
  @media print {
    body { max-width: none; padding: 0; background: white; }
    h1 { font-size: 30px; }
    h2 { margin-top: 0; }
    a { color: #075e92; }
  }
</style>
</head>
<body>
${body}
</body>
</html>`;

fs.writeFileSync(outputPath, html, "utf8");
console.log(`Created ${outputPath}`);
