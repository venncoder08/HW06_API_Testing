# HW06 Postman/Newman Tests

This directory contains generated artifacts for FR04, FR09 and FR17.

## GitHub Actions regression suite

The workflow `.github/workflows/api-tests.yml` starts a clean SUT on an Ubuntu runner and executes a deterministic Newman subset for FR04, FR09 and FR17.

```powershell
npm.cmd run newman:ci
```

CI data is stored under `postman/data/ci/`. The workflow publishes JUnit XML, HTML reports, `RUN-SUMMARY.txt` and `sut.log` as the `newman-api-test-reports` artifact even when an assertion fails.

The CI subset is intentionally separate from `newman:all`: the full suite retains known SUT failures for defect reporting, while the blocking CI regression subset contains reviewed cases with deterministic fixtures.

## Student header

The local environment now contains:

```text
studentId = 23127522
```

The collection-level pre-request script adds this header to every request:

```http
X-Student-Id: 23127522
```

If Postman UI still uses an older imported environment, either set `studentId` to `23127522` manually or re-import `postman/environments/local.postman_environment.json`.

## Run Newman step by step

Open PowerShell and run the commands from the workspace.

### 1. Install Newman and the HTML reporter

```powershell
cd "D:\2025-2026 HK9\Test\HW07\hw06-api-tests"
npm.cmd install
```

This creates local `node_modules`; the Newman executable is then available to the npm scripts.

### 2. Start the backend in another PowerShell window

```powershell
cd "D:\2025-2026 HK9\Test\HW07\eshop-sut\backend"
node server.js
```

Wait until the terminal prints:

```text
Server is running on http://localhost:3000
```

Starting this backend runs `database.js`, which resets and seeds the SQLite database.

### 3. Run one suite first

In the `hw06-api-tests` terminal:

```powershell
npm.cmd run newman:fr04:get
```

### 4. Run the remaining suites

```powershell
npm.cmd run newman:fr04:put
npm.cmd run newman:fr09
npm.cmd run newman:fr17:get
npm.cmd run newman:fr17:create
npm.cmd run newman:fr17:delete
```

Or run all six sequentially:

```powershell
npm.cmd run newman:all
```

`newman:all` continues through all six suites even if one suite fails. It returns a failing exit code only after all suites finish and writes `reports/newman/RUN-SUMMARY.txt`.

### 5. Open the HTML reports

Reports are written to:

```text
reports/newman/FR04-GET.html
reports/newman/FR04-PUT.html
reports/newman/FR09-APPLY.html
reports/newman/FR17-GET.html
reports/newman/FR17-CREATE.html
reports/newman/FR17-DELETE.html
```

Example PowerShell command:

```powershell
Start-Process .\reports\newman\FR04-GET.html
```

### 6. Preserve evidence

- Save the six HTML files.
- Capture the CLI summary and failures.
- Capture Postman Console output showing `X-Student-Id: 23127522`.
- Do not count `manual-review` cases as passed; execute and document them separately.

## Execution status

- All 197 testcase IDs were executed through the six main Newman suites or controlled prepared runs.
- Final result: 80 PASS, 117 FAIL, 0 BLOCKED.
- `studentId` is configured as `23127522` in the committed local environment.
- The collection pre-request script logs and attaches `X-Student-Id` on every request.
- JSON and Postman scripts can be revalidated with `npm.cmd run review:json` without calling the SUT.

## Files

```text
postman/
  collections/
    HW06-FR04.postman_collection.json
    HW06-FR09.postman_collection.json
    HW06-FR17.postman_collection.json
  environments/
    local.postman_environment.json
  data/
    fr04-get.json
    fr04-put.json
    fr09-apply.json
    fr17-get.json
    fr17-create.json
    fr17-delete.json
```

## Data-driven model

Each data row includes:

- `id`: test case ID matching `test-plans/`.
- `input` and `expected`: the human-readable source plan text.
- `body`, `authMode`, expected status class and dynamic assertions.
- `automationStatus`:
  - `ready`: can be automated after review.
  - `fixture-required`: requires a controlled database state before the iteration.
  - `manual-review`: concurrency or multi-step behavior still needs manual implementation/review.

## Important review points

- FR09 usage cases require isolated usage fixtures. Do not run all iterations on a dirty database.
- `INACTIVE10` is not part of the default seed and must be added as a fixture before its case.
- FR17 concurrency and double-delete cases are marked `manual-review` rather than pretending a sequential request proves concurrency.
- The collections use broad `2xx/4xx` assertions where the source specification does not define exact status codes.
- XSS checks cover only the API portion. DOM execution needs a separate browser/UI test.

## Reproduction notes

1. Start from the default EShop SQLite seed.
2. Run `npm.cmd run newman:all` for the six diagnostic suites.
3. Run `node scripts/run-prepared-cases.mjs` for fixture-dependent cases.
4. Preserve the generated HTML reports and restore the default database seed.
5. Do not reinterpret known assertion failures as automation failures without reviewing the response and fixture state.
