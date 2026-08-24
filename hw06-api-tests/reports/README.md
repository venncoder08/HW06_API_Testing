# Newman HTML Reports

Newman sẽ tạo báo cáo trong `reports/newman/` sau khi chạy:

- `FR04-GET.html`
- `FR04-PUT.html`
- `FR09-APPLY.html`
- `FR17-GET.html`
- `FR17-CREATE.html`
- `FR17-DELETE.html`
- `RUN-SUMMARY.txt` (kết quả PASS/FAIL ở mức suite khi chạy `newman:all`)

Sáu HTML report đã được tạo từ các lần chạy Newman thật. Kết quả cuối được tổng hợp trong `test-cases/audit-overrides.json`: 80 PASS, 117 FAIL, 0 BLOCKED. Các case cần fixture riêng nằm trong `reports/newman/prepared/`, còn tám bằng chứng CLI đại diện nằm trong `reports/newman/console-issues/` và `issues/`.

GitHub Actions ghi regression reports vào `reports/ci/`. Thư mục này không được commit; workflow upload HTML, JUnit XML, `RUN-SUMMARY.txt` và `sut.log` thành artifact `newman-api-test-reports` sau mỗi run.
