# Prepared Fixture and Manual Case Results

Generated: 2026-08-24T16:14:58.333Z

| Test Case | Status | Actual Result | Bug ID | Evidence |
| --- | --- | --- | --- | --- |
| FR09-TC-015 | PASS | Prepared fixture run passed all Newman assertions for FR09-TC-015. | - | hw06-api-tests/reports/newman/prepared/FR09-TC-015.html; hw06-api-tests/reports/newman/prepared/FR09-TC-015.json |
| FR09-TC-050 | PASS | Prepared fixture run passed all Newman assertions for FR09-TC-050. | - | hw06-api-tests/reports/newman/prepared/FR09-TC-050.html; hw06-api-tests/reports/newman/prepared/FR09-TC-050.json |
| FR09-TC-051 | PASS | Prepared fixture run passed all Newman assertions for FR09-TC-051. | - | hw06-api-tests/reports/newman/prepared/FR09-TC-051.html; hw06-api-tests/reports/newman/prepared/FR09-TC-051.json |
| FR09-TC-052 | PASS | Prepared fixture run passed all Newman assertions for FR09-TC-052. | - | hw06-api-tests/reports/newman/prepared/FR09-TC-052.html; hw06-api-tests/reports/newman/prepared/FR09-TC-052.json |
| FR09-TC-053 | PASS | Prepared fixture run passed all Newman assertions for FR09-TC-053. | - | hw06-api-tests/reports/newman/prepared/FR09-TC-053.html; hw06-api-tests/reports/newman/prepared/FR09-TC-053.json |
| FR17-TC-010 | PASS | Prepared fixture run passed all Newman assertions for FR17-TC-010. | - | hw06-api-tests/reports/newman/prepared/FR17-TC-010.html; hw06-api-tests/reports/newman/prepared/FR17-TC-010.json |
| FR09-TC-054 | PASS | Prepared usage 1; first apply HTTP 200 (discount=100000, final=400000); recorded usage HTTP 200; database usage=2; second apply HTTP 400. | - | hw06-api-tests/reports/newman/prepared/PREPARED-CASES-SUMMARY.md; hw06-api-tests/reports/newman/prepared/PREPARED-RESULTS.json |
| FR17-TC-075 | FAIL | Two concurrent create requests returned HTTP 200 and 500; database rows with code HW06_FR17_075=1. Expected one 2xx, one 4xx, and one row. | #5 | hw06-api-tests/reports/newman/prepared/PREPARED-CASES-SUMMARY.md; hw06-api-tests/reports/newman/prepared/PREPARED-RESULTS.json; https://github.com/venncoder08/HW06_API_Testing/issues/5 |
| FR17-TC-085 | PASS | First DELETE HTTP 200; second DELETE HTTP 200 (exact second status is a specification gap); target rows=0; SAVE10 rows=1. | - | hw06-api-tests/reports/newman/prepared/PREPARED-CASES-SUMMARY.md; hw06-api-tests/reports/newman/prepared/PREPARED-RESULTS.json |
