# Newman Console Evidence for GitHub Issues

Each PNG below is rendered from a fresh Newman CLI run of one representative testcase. The corresponding raw log is preserved under `hw06-api-tests/reports/newman/console-issues/`.

Every run shows:

- `X-Student-Id: 23127522` from the collection pre-request script.
- Requests sent to `http://localhost:3000`.
- Newman exit code `1`.
- The executed/failed summary and target assertion failure.

| GitHub Issue | Testcase | Newman console PNG | Target evidence |
| --- | --- | --- | --- |
| [#1](https://github.com/venncoder08/HW06_API_Testing/issues/1) | FR04-TC-009 | [issue-01-FR04-TC-009-newman-console.png](issue-01-FR04-TC-009-newman-console.png) | Response contains `password` |
| [#2](https://github.com/venncoder08/HW06_API_Testing/issues/2) | FR04-TC-020 | [issue-02-FR04-TC-020-newman-console.png](issue-02-FR04-TC-020-newman-console.png) | Invalid 9-digit phone returns `2xx` and changes profile |
| [#3](https://github.com/venncoder08/HW06_API_Testing/issues/3) | FR09-TC-001 | [issue-03-FR09-TC-001-newman-console.png](issue-03-FR09-TC-001-newman-console.png) | Incorrect `discount_amount` and `final_amount` |
| [#4](https://github.com/venncoder08/HW06_API_Testing/issues/4) | FR17-TC-003 | [issue-04-FR17-TC-003-newman-console.png](issue-04-FR17-TC-003-newman-console.png) | Regular-user GET returns `2xx` instead of `4xx` |
| [#5](https://github.com/venncoder08/HW06_API_Testing/issues/5) | FR17-TC-020 | [issue-05-FR17-TC-020-newman-console.png](issue-05-FR17-TC-020-newman-console.png) | Duplicate code returns HTTP `500` instead of controlled `4xx` |
| [#6](https://github.com/venncoder08/HW06_API_Testing/issues/6) | FR17-TC-078 | [issue-06-FR17-TC-078-newman-console.png](issue-06-FR17-TC-078-newman-console.png) | Regular-user DELETE returns `2xx` and removes coupon |
| [#7](https://github.com/venncoder08/HW06_API_Testing/issues/7) | FR04-TC-007 | [issue-07-FR04-TC-007-newman-console.png](issue-07-FR04-TC-007-newman-console.png) | Basic authorization scheme returns `2xx` |
| [#8](https://github.com/venncoder08/HW06_API_Testing/issues/8) | FR04-TC-010 | [issue-08-FR04-TC-010-newman-console.png](issue-08-FR04-TC-010-newman-console.png) | Response contains `reset_token` |

The runner restores default coupons with IDs 1-4, clears `coupon_usage`, and resets the test user's profile after all eight executions.
