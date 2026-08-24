# Test Cases and Execution Results

Ba file Excel duoc sinh tu `test-plans/`, sau do ket hop ket qua trong sau Newman HTML reports va cac lan chay co database fixture rieng.

| Suite | Test cases | Audit VALID | PASS | FAIL | BLOCKED |
| --- | ---: | ---: | ---: | ---: | ---: |
| FR04 | 50 | 50 | 7 | 43 | 0 |
| FR09 | 58 | 58 | 33 | 25 | 0 |
| FR17 | 89 | 89 | 40 | 49 | 0 |
| **Total** | **197** | **197** | **80** | **117** | **0** |

## Audit va execution

`Audit` danh gia thiet ke testcase, doc lap voi ket qua chay:

- `VALID`: input, ky thuat va expected result phu hop requirement/specification.
- `INVALID`: testcase khong co co so hoac oracle sai.
- `INCOMPLETE`: testcase con thieu du lieu, buoc thuc hien hoac expected result de co the review.

`Execution Status` phan anh ket qua thuc thi:

- `PASS`: moi assertion cua testcase deu pass.
- `FAIL`: it nhat mot assertion fail; testcase van co the co Audit la `VALID` va phat hien backend defect.
- `BLOCKED`: chua co fixture phu hop hoac can chay thu cong/stateful/concurrent, nen chua du bang chung de ket luan pass/fail.

Chin testcase truoc day bi `BLOCKED` da duoc chay lai sau khi chuan bi database. Tam testcase PASS; `FR17-TC-075` FAIL do hai request tao coupon dong thoi tra HTTP `200` va `500` thay vi mot `2xx` va mot `4xx` (GitHub issue `#5`).

## Cac cot Excel

- `ID`, `Type`, `Technique / Ref`, `Input / Action`, `Expected Result`: thiet ke testcase.
- `Audit`, `Note`: ket qua review thiet ke va ly do audit.
- `Actual Result`, `Execution Status`: ket qua thuc thi hoac ly do bi blocked.
- `Bug ID`: GitHub Issue da triage cho loi dai dien.
- `Evidence`: Newman report, iteration, prepared-run evidence va GitHub Issue URL.

Moi workbook co hai sheet:

- `FR04`, `FR09` hoac `FR17`: toan bo testcase va ket qua chi tiet.
- `Summary`: tong so testcase, Audit, PASS/FAIL/BLOCKED va danh sach bug duoc lien ket.

Bang chung cua cac ca chay co fixture nam tai `hw06-api-tests/reports/newman/prepared/`.
