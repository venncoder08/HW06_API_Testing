# EShop API Test Plans - FR04, FR09, FR17

## 1. Phạm vi

- `FR04.md`: `GET /api/users/me`, `PUT /api/users/me`.
- `FR09.md`: `POST /api/apply-coupon`.
- `FR17.md`: `GET /api/coupons`, `POST /api/admin/coupons`, `DELETE /api/admin/coupons/:id`.

Chỉ ba task được giao nằm trong phạm vi. Mỗi file có ít nhất 35 test case AI-generated và cần được sinh viên audit bằng `VALID`, `INVALID` hoặc `INCOMPLETE` trước khi thực thi.

## 2. Test basis

Thứ tự ưu tiên khi xác định expected result:

1. `eshop-sut/README.md`: business requirements đúng.
2. `eshop-sut/api_specification.md`: endpoint và request contract.
3. `eshop-sut/backend/server.js`: SUT thực tế, chỉ dùng để nhận diện risk; không dùng làm oracle.

## 3. Quy tắc oracle

- Khi specification không quy định status cụ thể, success được assert bằng nhóm `2xx`, request bị từ chối bằng nhóm `4xx`.
- Không báo bug chỉ vì server trả `200` thay vì `201`, hoặc `400` thay vì `422`, nếu specification không quy định chính xác.
- Schema chỉ assert các field được requirement/specification nêu rõ và các field bảo mật bị cấm.
- `GET /api/users/me` phải cung cấp dữ liệu hồ sơ cần thiết và không được lộ `password`, `reset_token` hoặc secret.
- Apply-coupon success phải có `discount_amount` và `final_amount` đúng công thức. Các field success khác không bị coi là lỗi nếu spec không cấm.
- Error response phải là JSON hợp lệ, không lộ SQL, stack trace, password, token hoặc secret. Exact error message không được dùng làm oracle nếu spec không quy định.
- Mỗi test case chỉ có một input partition. Nhiều partitions được triển khai bằng nhiều test ID hoặc nhiều iteration riêng.
- Một reusable schema assertion không được tính thành test case riêng; nó được gắn vào từng request liên quan.

## 4. Quy ước thực thi

- Base URL: `http://localhost:3000`.
- Mọi request có `X-Student-Id: {{studentId}}` từ collection-level pre-request script.
- Token được lấy động từ `POST /api/login`.
- Database được reset trước full run.
- Dữ liệu seed:
  - User: `test@eshop.com / Test1234!`.
  - Admin: `admin@eshop.com / Admin123!`.
  - Coupons: `SAVE10`, `BIGBUY`, `VIP100`, `EXPIRED`.
- Test làm thay đổi dữ liệu phải có cleanup hoặc dùng fixture/database reset độc lập.

## 5. Specification gaps không dùng để kết luận bug

- Response schema chi tiết của profile, coupon list, coupon create và coupon delete chưa được đặc tả.
- Error status và error schema chưa được đặc tả chính xác.
- FR04 không quy định name/address có bắt buộc hay có giới hạn độ dài không.
- FR04 không nói PUT là full replacement hay partial update.
- FR09 vừa yêu cầu JWT trong SRS vừa đưa `user_id` trong body example. Plan dùng secure contract: `user_id` phải khớp JWT; mismatch phải bị từ chối.
- `/api/coupon-usage` tồn tại trong implementation nhưng không có trong API specification. Nó chỉ được dùng để chuẩn bị usage fixture, không được tính là API test case của FR09.
- FR09 không định nghĩa rounding cho percent discount khi kết quả có phần thập phân.
- FR17 không định nghĩa code có phân biệt hoa/thường, giới hạn độ dài, discount percent tối đa, hoặc chính sách xóa coupon đã được sử dụng.
- FR17 không định nghĩa status khi DELETE một ID không tồn tại; test chỉ assert không xóa nhầm resource khác.
- FR17 có tên CRUD nhưng chỉ đặc tả Create, Read, Delete; không có Update endpoint.

## 6. Security coverage trong đúng phạm vi

| Task | Coverage |
| --- | --- |
| FR04 | JWT, sensitive data exposure, SQL injection, XSS API portion, mass assignment, role escalation, ownership |
| FR09 | JWT, inactive/expired/usage rules, SQL injection, identity mismatch, quota isolation |
| FR17 | JWT, admin role, SQL injection, mass assignment, unauthorized create/read/delete |

XSS execution trong DOM là UI/browser test. API plan chỉ kiểm tra payload không gây server-side execution, response vẫn là JSON và dữ liệu không làm hỏng contract. Không dùng Newman để kết luận trực tiếp rằng browser không thực thi script.

## 7. Audit checklist

Với từng case, sinh viên cần bổ sung trong Excel hoặc audit report:

- Audit label: `VALID`, `INVALID`, `INCOMPLETE`.
- Lý do dựa trên requirement/specification.
- Request body hoàn chỉnh hoặc data-file row.
- Actual result và Pass/Fail.
- Bug ID nếu failure đã được triage thành defect thật.
- Evidence: Postman Console, response, Newman report hoặc screenshot.
