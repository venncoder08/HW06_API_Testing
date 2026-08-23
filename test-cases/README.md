# Test Cases for Human Audit

Các file trong thư mục này được tạo từ `test-plans/` để sinh viên thực hiện human audit.

| Suite | Số test case | Audit |
| --- | ---: | --- |
| FR04 | 50 | PENDING HUMAN AUDIT |
| FR09 | 58 | PENDING HUMAN AUDIT |
| FR17 | 89 | PENDING HUMAN AUDIT |

## Type

- `Boundary`: kiểm tra tại hoặc quanh biên.
- `Equivalence Partitioning`: đại diện miền dữ liệu hợp lệ/không hợp lệ.
- `State Transition`: kiểm tra trạng thái hoặc lifecycle.
- `Security`: authentication, authorization, injection, exposure hoặc escalation.
- `Schema`: hình dạng và field của response.
- `Calculation`: công thức nghiệp vụ.
- `Data Integrity`: uniqueness, isolation hoặc không làm thay đổi dữ liệu ngoài phạm vi.
- `Concurrency`: hành vi của request đồng thời.
- `Positive` / `Functional`: luồng hợp lệ hoặc hành vi chức năng cơ bản.

## Audit workflow

Với từng testcase:

1. Đọc test basis, input và expected result.
2. Thay `PENDING HUMAN AUDIT` bằng `VALID`, `INVALID` hoặc `INCOMPLETE`.
3. Ghi lý do, điểm thiếu hoặc nội dung cần sửa trong cột `Note`.
4. Không dùng kết quả thực thi Pass/Fail làm nhãn audit thiết kế.

## Execution status

Audit không phải kết quả chạy. Khi tổng hợp báo cáo, bổ sung riêng Actual Result, `Pass / Fail / Blocked`, Bug ID và Evidence.
