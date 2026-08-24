---
name: hw06-api-testing
description: Plan, audit, execute, and report the HW06 EShop API testing assignment with Postman/Newman, Excel evidence, bug triage, and GitHub Actions. Use for this assignment or repositories with the same HW06 deliverables; do not use as a generic API-development skill.
metadata:
  short-description: Complete and audit HW06 EShop API testing
---

# HW06 API Testing

Produce a traceable submission from requirements through execution evidence. Treat the SRS and API specification as the oracle; treat backend behavior as the observed SUT, not as the expected result.

## Start

1. Read the homework statement, the selected feature requirements, the API specification, and the relevant backend routes.
2. Inspect the working tree before editing. Preserve unrelated work and do not regenerate deliberately removed deliverables.
3. Read [references/hw06-requirements.md](references/hw06-requirements.md) when checking assignment coverage or submission completeness.
4. Read [references/repository-conventions.md](references/repository-conventions.md) when working in the supplied HW06 repository.

## Test Design

- Keep at least 35 atomic cases for each selected API/feature.
- Partition every request parameter by valid, invalid, missing, null, wrong type, boundary, and security-relevant values when applicable.
- Add state-transition cases only when the selected feature has meaningful state. Do not import unrelated FR10 cases merely because the assignment gives FR10 as an example.
- Map applicable security behavior into the feature cases. Avoid inventing separate SEC tasks when the student did not select them.
- Validate the response contract: status class or exact status when specified, required types and fields, forbidden sensitive fields, formula results, and persisted state.
- Identify at least five student-authored extensions per selected API. Keep them distinguishable from AI-generated cases and record why the initial AI pass missed them.

## Automation

- Add `X-Student-Id` through a collection-level pre-request script and show the real value in Postman Console evidence.
- Use an environment for `baseUrl`, credentials, tokens, IDs, and student ID. Avoid hard-coded tokens.
- Keep data-driven rows aligned one-to-one with testcase IDs.
- Use setup/login requests and dynamic variables so GET, PUT, POST, and DELETE folders receive the correct token and resource IDs.
- Do not claim a case passed when Newman ran no assertions or when its required fixture was absent.

## Fixtures and Execution

- Prepare controlled database state for inactive, expired, quota, empty-list, lifecycle, and concurrency cases.
- Restore the default seed after execution, including SQLite sequences when deterministic IDs matter.
- Do not delete the SQLite database merely to reset it unless the user explicitly authorizes that method.
- Store actual HTML/JSON/CLI evidence. Never fabricate reports, screenshots, GitHub runs, or issue links.

## Audit Semantics

- `Audit` evaluates testcase design: `VALID`, `INVALID`, or `INCOMPLETE`.
- `Execution Status` evaluates the run: `PASS`, `FAIL`, or `BLOCKED`.
- A valid testcase that exposes a backend defect remains `Audit = VALID` and `Execution Status = FAIL`.
- Record `Actual Result`, `Bug ID`, and `Evidence` separately. Recompute workbook summaries after fixture overlays.

## Reporting

- Include a table of contents, scope, requirements, design techniques, automation architecture, environment, execution results, defects, CI/CD, AI audit, AI critique, agent usage, limitations, and submission checklist.
- Link the green, red, and recovery commits and their actual GitHub Actions runs.
- List only Postman features that were genuinely used.
- Keep the required self-drawn AI test-generator diagram as a student action. The agent may review it, but must not generate or misrepresent it as self-drawn.
- Produce Markdown and PDF versions and validate that the PDF opens and contains the expected page count/content.

## Completion Check

Before declaring completion, verify collections, environment, data files, reports, final Excel workbooks, bug evidence, CI evidence, main report, AI appendix, critique, agent skill, student-drawn diagram, pseudocode, root README, and submission ZIP naming.
