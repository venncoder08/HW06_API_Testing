# Newman HTML Reports

Newman sẽ tạo báo cáo trong `reports/newman/` sau khi chạy:

- `FR04-GET.html`
- `FR04-PUT.html`
- `FR09-APPLY.html`
- `FR17-GET.html`
- `FR17-CREATE.html`
- `FR17-DELETE.html`
- `RUN-SUMMARY.txt` (kết quả PASS/FAIL ở mức suite khi chạy `newman:all`)

Thư mục hiện chưa có HTML report nếu Newman chưa được chạy bằng các script trong `package.json`.

GitHub Actions ghi regression reports vào `reports/ci/`. Thư mục này không được commit; workflow upload HTML, JUnit XML, `RUN-SUMMARY.txt` và `sut.log` thành artifact `newman-api-test-reports` sau mỗi run.
