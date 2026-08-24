# HW06-AI API Testing - 23127522

Repository for API testing of the EShop SUT with Postman, Newman, SQLite fixtures and GitHub Actions.

## Submission Summary

| Metric | Result |
| --- | ---: |
| Selected APIs/features | 3: FR04, FR09, FR17 |
| AI-generated and human-reviewed testcases | 197 |
| Separately labelled student-authored additions | 0 |
| Executed testcases | 197 |
| PASS | 80 |
| FAIL | 117 |
| BLOCKED | 0 |
| Public GitHub Issues | 8 |

All 197 testcase designs have `Audit = VALID`. Execution status is recorded independently, so a valid testcase can fail when it exposes a SUT defect. The assignment asks for five separately student-authored additions per API; this repository does not relabel AI-assisted cases as student-authored work.

## Self-Assessment

| No. | Criterion | Maximum | Self-assessed |
| ---: | --- | ---: | ---: |
| 1 | API 1 - FR04 full workflow | 30 | 30 |
| 2 | API 2 - FR09 full workflow | 30 | 30 |
| 3 | API 3 - FR17 full workflow | 30 | 30 |
| 4 | Agent Skill and AI test-generator design | 10 | 5 |
|  | **Total** | **100** | **95** |

The five-point deduction is the student's self-assessment for not providing an Agent Skill demonstration video.

## Main Deliverables

- Main report: `docs/Main_Report.md` and `docs/Main_Report.pdf`.
- AI audit: `docs/AI_Audit_Report.md` and `docs/AI_Audit_Report.pdf`.
- Detailed interaction log: `docs/AI_Interaction_Log.md` and `docs/AI_Interaction_Log.pdf`.
- AI critique: `docs/AI_Critique.md` and `docs/AI_Critique.pdf`.
- CI/CD report: `docs/CI-CD-REPORT.md`.
- Test plans: `test-plans/`.
- Excel testcases: `test-cases/FR04-Test-Cases.xlsx`, `FR09-Test-Cases.xlsx`, and `FR17-Test-Cases.xlsx`.
- Postman/Newman automation and HTML reports: `hw06-api-tests/`.
- Newman console evidence: `issues/NEWMAN-CONSOLE-EVIDENCE.md`.
- Reusable Agent Skill: `agent-skills/hw06-api-testing/`.
- Generator design: `docs/ai-test-generator-flow.png`, `docs/ai-test-generator.mmd`, and `docs/ai-test-generator-pseudocode.md`.
- Git commit history: `git-commit-log.txt`.

## Run Locally

```powershell
npm.cmd ci --prefix hw06-api-tests
node .\eshop-sut\backend\server.js
npm.cmd run newman:all --prefix hw06-api-tests
```

The local EShop backend must be available at `http://localhost:3000`. Newman writes the six primary HTML reports to `hw06-api-tests/reports/newman/`.

## CI/CD Evidence

- Green run: https://github.com/venncoder08/HW06_API_Testing/actions/runs/32733160221
- Intentional red run: https://github.com/venncoder08/HW06_API_Testing/actions/runs/32742769020
- Recovery run: https://github.com/venncoder08/HW06_API_Testing/actions/runs/32743294527

The blocking CI workflow runs a deterministic 19-iteration regression subset. The full 197-case suite remains the diagnostic execution source and contains known SUT failures.

## Submission Filename

```text
23127522_HW06_AI_API_095.zip
```
