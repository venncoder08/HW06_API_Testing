# CI/CD Report - GitHub Actions and Newman

## 1. Pipeline scope

The workflow `.github/workflows/api-tests.yml` runs a deterministic API regression subset for FR04, FR09 and FR17 against the local EShop SUT on every push, pull request and manual dispatch.

The blocking CI subset is separate from the full diagnostic suite. `newman:all` keeps the known SUT failures visible for defect reporting; `newman:ci` contains reviewed cases with deterministic seed data so a green pipeline remains meaningful.

## 2. Pipeline configuration

Runner and tools:

- GitHub-hosted `ubuntu-latest` runner.
- Node.js 22.
- EShop Express/SQLite backend on `http://127.0.0.1:3000`.
- Newman with CLI, JUnit and HTMLExtra reporters.
- `X-Student-Id: 23127522` injected by the collection pre-request script.

Pipeline sequence:

1. Check out the API testing repository.
2. Clone `ttbhanh/eshop-sut` and pin commit `85af3ba875c88283615e22cb108f13e2fccaf0e9`.
3. Install the SUT and Newman dependencies with `npm ci`.
4. Validate all Postman JSON files and collection scripts.
5. Start the SUT, which creates and seeds a fresh SQLite database, then wait for its health check.
6. Run `npm run newman:ci --prefix hw06-api-tests`.
7. Upload HTML reports, JUnit XML, `RUN-SUMMARY.txt` and `sut.log` even when tests fail.
8. Stop the SUT process.

## 3. CI regression cases

| Feature | Data file | Testcase IDs |
| --- | --- | --- |
| FR04 | `fr04-get-ci.json` | FR04-TC-001, 003, 004, 005, 006 |
| FR09 | `fr09-apply-ci.json` | FR09-TC-002, 003, 010 |
| FR17 GET | `fr17-get-ci.json` | FR17-TC-001, 002, 004, 005, 007 |
| FR17 CREATE | `fr17-create-ci.json` | FR17-TC-011, 012, 013, 015 |
| FR17 DELETE | `fr17-delete-ci.json` | FR17-TC-076, 077 |

Total: 19 CI iterations.

## 4. Green run

| Evidence | Value |
| --- | --- |
| Commit | `TODO_GREEN_SHA` |
| Commit URL | `TODO_GREEN_COMMIT_URL` |
| Actions run | `TODO_GREEN_RUN_URL` |
| Result | All CI API test iterations passed |
| Screenshot | `docs/images/ci-green.png` |
| Artifact | `newman-api-test-reports` |

## 5. Red run

The red demonstration commit changes only `FR04-TC-001` in the CI-only data file from expected HTTP class `2` to `4`. The SUT still returns `2xx`, so exactly this testcase is expected to fail. Production code and the full testcase source remain unchanged.

| Evidence | Value |
| --- | --- |
| Commit | `TODO_RED_SHA` |
| Commit URL | `TODO_RED_COMMIT_URL` |
| Actions run | `TODO_RED_RUN_URL` |
| Result | One intentionally failing CI testcase |
| Screenshot | `docs/images/ci-red.png` |
| Failed testcase | `FR04-TC-001` |
| Artifact | `newman-api-test-reports` |

## 6. Recovery

After collecting the red-run evidence, revert the demonstration commit so the default branch returns to green. Keep the red commit and its Actions run accessible through Git history.

| Evidence | Value |
| --- | --- |
| Revert commit | `TODO_REVERT_SHA` |
| Revert Actions run | `TODO_REVERT_RUN_URL` |

## 7. Screenshots and links checklist

- [ ] Green Actions summary screenshot added as `docs/images/ci-green.png`.
- [ ] Red Actions summary and failed assertion screenshot added as `docs/images/ci-red.png`.
- [ ] Green commit and Actions URLs filled in.
- [ ] Red commit and Actions URLs filled in.
- [ ] Revert commit and Actions URL filled in.
- [ ] Both Actions runs expose the `newman-api-test-reports` artifact.
