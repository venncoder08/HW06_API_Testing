# Repository Conventions

## Current Scope

- Student ID: `23127522`.
- Selected features: FR04, FR09, FR17.
- Public repository: `https://github.com/venncoder08/HW06_API_Testing`.
- Postman/Newman root: `hw06-api-tests/`.
- Test plans: `test-plans/`.
- Final workbooks: `test-cases/FR04-Test-Cases.xlsx`, `test-cases/FR09-Test-Cases.xlsx`, and `test-cases/FR17-Test-Cases.xlsx`.

## Main Commands

```powershell
npm.cmd run review:json --prefix hw06-api-tests
npm.cmd run newman:all --prefix hw06-api-tests
node hw06-api-tests/scripts/run-prepared-cases.mjs
node hw06-api-tests/scripts/apply-report-audit.mjs
powershell.exe -NoProfile -ExecutionPolicy Bypass -File hw06-api-tests/scripts/export-test-cases.ps1
```

## Result Model

- Total: 197 cases.
- FR04: 50 cases, 7 PASS, 43 FAIL.
- FR09: 58 cases, 33 PASS, 25 FAIL.
- FR17: 89 cases, 40 PASS, 49 FAIL.
- Total execution: 80 PASS, 117 FAIL, 0 BLOCKED.
- GitHub Issues: `#1` through `#8`.

## CI Evidence

- Green commit: `e4c5f9160aa821ccb8588f8a6c867a3bb78a5586`.
- Green run: `https://github.com/venncoder08/HW06_API_Testing/actions/runs/32733160221`.
- Red commit: `b3a3c6c3030cc1caf54caee75d16951b2f63d8e3`.
- Red run: `https://github.com/venncoder08/HW06_API_Testing/actions/runs/32742769020`.
- Recovery commit: `e4b5f3a378447e3e7ccb501823e8f6d95859120e`.
- Recovery run: `https://github.com/venncoder08/HW06_API_Testing/actions/runs/32743294527`.

## File Hygiene

- Do not add Excel lock files such as `~$*.xlsx`.
- Do not submit `.prepared/` working directories or duplicate `*-updated.xlsx` files after the final workbook is replaced.
- Six primary Newman HTML reports are ignored by the current nested `.gitignore`; explicitly include them or revise the ignore rule before submission.
- `guide.md` is supporting material and is ignored by the root `.gitignore`; it is not a substitute for the main report.
