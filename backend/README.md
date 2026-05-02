# Kiến trúc hệ thống Rèm Cửa Thông Minh (CoAP)

Hệ thống sử dụng Node.js làm Backend và ESP8266 làm vi điều khiển, giao tiếp với nhau 100% bằng giao thức CoAP. Để đảm bảo độ ổn định cao nhất và tránh lỗi tràn bộ nhớ (Crash/Reset) trên mạch ESP8266 do các hạn chế của thư viện, hệ thống áp dụng kiến trúc **ESP8266 đóng vai trò 100% là CoAP Client (Cơ chế Polling)**.

## 1. Luồng truyền dữ liệu cảm biến (Sensor Flow)
- **Thiết bị chủ động:** ESP8266.
- **Hoạt động:** Cứ mỗi 10 giây, ESP8266 thu thập dữ liệu cảm biến ánh sáng (LDR) và gửi một gói tin `CoAP PUT` lên đường dẫn `/sensor` của Backend.
- **Backend xử lý:** `coap-listener.js` lắng nghe sự kiện ở `/sensor`, in dữ liệu ra terminal (hoặc lưu vào Database) và phản hồi `ACK`.

## 2. Luồng điều khiển rèm (Command Flow / Polling)
Thay vì Backend chủ động ép ESP nhận gói tin gây ra lỗi văng bộ nhớ (Exception), chúng ta sử dụng cơ chế "Polling" (Hỏi vòng).

- **Bước 1 (User -> Backend):** Người dùng bấm nút trên App/Web. Ứng dụng gọi HTTP `POST /api/curtain/control` với nội dung `{"action": "open"}` hoặc `{"action": "close"}`.
- **Bước 2 (Backend lưu trữ):** File `curtain-controller.js` nhận yêu cầu, không gửi cho ESP ngay mà gọi hàm của `state.js` để lưu lệnh vào RAM. HTTP API trả về thông báo: "Đã lưu lệnh".
- **Bước 3 (ESP -> Backend):** Đều đặn mỗi 1 giây, ESP8266 chủ động gửi gói tin `CoAP GET /command` lên Backend để hỏi xem có lệnh mới không.
- **Bước 4 (Backend -> ESP):** 
  - Nếu bộ nhớ tạm đang có lệnh, Backend gửi trả lệnh đó cho ESP (ví dụ: `open`), sau đó tự động xóa lệnh khỏi RAM (tránh việc gửi lặp lại vào giây tiếp theo).
  - Nếu không có lệnh nào, Backend trả về chuỗi `none`.
- **Bước 5 (ESP xử lý):** Hàm `callback_response` trên ESP nhận được chuỗi trả lời. Nếu là `open` hoặc `close`, vi điều khiển sẽ kích hoạt phần cứng (Motor) để điều khiển rèm. Nếu là `none`, ESP bỏ qua.

## Lợi ích của kiến trúc
1. **Chống Crash (rst cause 2):** ESP8266 luôn là thiết bị khởi tạo kết nối. Nó chủ động cấp phát đủ bộ nhớ để đón nhận phản hồi, triệt tiêu hoàn toàn lỗi buffer overflow do các thư viện giá rẻ gây ra.
2. **Kháng lỗi mạng tốt (Resilience):** Nếu rèm cửa bị mất điện hoặc đứt WiFi, lệnh của người dùng (từ Web) vẫn được lưu an toàn trên Node.js. Ngay khi kết nối lại, ESP sẽ chủ động lên hỏi và nhận được lệnh đi trễ, không lo việc bị "thất lạc gói tin" do nghẽn mạng.
3. **Tính tuân thủ:** Hệ thống đáp ứng hoàn toàn yêu cầu môn học/đồ án về việc ứng dụng giao thức IoT CoAP truyền thống.
