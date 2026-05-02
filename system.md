# Tài liệu Kiến trúc Hệ thống Smart Curtain

Tài liệu này mô tả chi tiết kiến trúc, chức năng của từng thư mục/file và luồng hoạt động (workflow) của toàn bộ hệ thống Rèm Cửa Thông Minh (Smart Curtain). Nó được thiết kế để giúp bạn dễ dàng làm báo cáo đồ án hoặc chuyển giao tài liệu.

## 1. Tổng quan Kiến trúc (Architecture)

Hệ thống được chia làm 3 thành phần độc lập (Micro-architecture) giao tiếp với nhau qua mạng:

1. **Frontend (Web Application)**: Giao diện người dùng được xây dựng bằng Next.js (React), cung cấp bảng điều khiển trực quan. Giao tiếp với Backend qua REST API (để gởi lệnh) và WebSockets (để nhận dữ liệu thời gian thực).
2. **Backend (Node.js Bridge)**: Trạm trung chuyển dữ liệu trung tâm. Chạy đồng thời một HTTP Server (Express), một WebSocket Server (Socket.io) và một CoAP Server (UDP).
3. **Firmware (ESP8266/ESP32)**: Phần cứng điều khiển động cơ bước (Stepper Motor) và đọc cảm biến quang (LDR). Giao tiếp với Backend qua giao thức CoAP siêu nhẹ.

---

## 2. Cấu trúc Thư mục và Nhiệm vụ

### 2.1. Thư mục `frontend/` (Next.js)
- **`app/page.tsx`**: File cốt lõi chứa toàn bộ giao diện UI. 
  - Hiển thị hoạt hình rèm cửa và thông số ánh sáng quy đổi thành text ("Trời tối", "Trời sáng").
  - Xử lý các sự kiện gạt công tắc (Auto/Manual), sự kiện bấm nút (Mở/Đóng) và gọi API `POST /api/curtain/control` xuống Backend.
  - Khởi tạo kết nối Socket.io để lắng nghe các sự kiện `sensor_data` (ánh sáng) và `curtain_status` (trạng thái rèm) từ Backend.

### 2.2. Thư mục `backend/` (Node.js)
- **`src/app.js`**: File khởi chạy chính. Tích hợp Express, Socket.io và CoAP vào cùng một tiến trình để chạy đồng thời trên cổng 3001 và 5683.
- **`src/controllers/curtain-controller.js`**: Tiếp nhận API HTTP từ Frontend. Kiểm tra tính hợp lệ của lệnh (`open`, `close`, `auto`, `manual`) và đẩy lệnh đó vào bộ nhớ đệm.
- **`src/routes/curtain-routes.js`**: Cấu hình URL định tuyến API (Routing) cho HTTP server.
- **`src/utils/state.js`**: Đóng vai trò là Bộ nhớ đệm (Buffer/RAM). Lưu trữ tạm thời lệnh từ Frontend chờ phần cứng ESP hỏi và lấy đi.
- **`src/listeners/coap-listener.js`**: "Trái tim" giao tiếp với phần cứng. Chạy UDP Server cổng 5683.
  - *Bắt request tới `/command`*: Lấy lệnh từ `state.js` trả về cho ESP.
  - *Bắt request tới `/sensor`*: Đọc giá trị ánh sáng từ ESP, lọc nhiễu phần cứng (sai số < 50), và phát `io.emit` lên thẳng Web.
  - *Bắt request tới `/status`*: Hứng trạng thái khi rèm đã đóng/mở xong ở mạch thật và phát `io.emit` lên Web để tắt hiệu ứng Loading.

### 2.3. Thư mục `curtain/` (Firmware ESP)
- **`src/main.cpp`**: Chứa toàn bộ logic C/C++.
  - Giao tiếp WiFi và gửi/nhận gói tin CoAP.
  - Chứa "não bộ" tự động (Auto Mode): Đọc LDR thông qua bộ chuyển đổi ADC (Analog-to-Digital Converter) để xuất xung điều khiển động cơ qua chân DIR/STEP.
  - Chứa logic ghi đè (Manual Override): Chấp nhận lệnh ưu tiên từ Web để vô hiệu hóa chế độ tự động ngay lập tức.

---

## 3. Luồng hoạt động của Hệ thống (System Flow)

### Luồng 1: Cơ chế Client-Polling (Phần cứng chủ động hỏi lệnh)
Thay vì Web đẩy thẳng lệnh xuống mạng của ESP (rất dễ gây quá tải và tràn bộ nhớ ngắt/exception 2 của ESP), hệ thống dùng cơ chế Polling an toàn hơn:
1. Web gởi lệnh `open` -> Backend lưu `open` vào RAM (`state.js`).
2. ESP mỗi 1 giây tự động gởi gói tin CoAP `GET /command` lên Backend.
3. Backend thấy ESP hỏi, liền bốc lệnh `open` trong RAM trả về cho ESP (kèm theo thao tác xóa bỏ lệnh đó trong RAM để tránh gửi trùng lặp).
4. ESP nhận được lệnh và bắt đầu cấp xung điều khiển Motor.

### Luồng 2: Real-time Feedback Full-Duplex (Phản hồi thời gian thực)
1. Trong lúc ESP đang cặm cụi xoay Motor, nút bấm trên Web sẽ bị khóa lại và hiển thị vòng xoay Loading chờ đợi.
2. Motor xoay xong 1000 bước, ESP gởi gói tin CoAP `PUT /status` với nội dung `open` lên Backend.
3. Backend nhận được chữ `open`, ngay lập tức dùng cơ chế WebSockets (Socket.io) đẩy thẳng thông điệp đó lên Web (độ trễ siêu thấp < 10ms).
4. Web nhận thông điệp, dừng vòng xoay Loading và bắt đầu chạy CSS Animation trượt rèm ra. Điều này giúp Web mô phỏng chính xác trạng thái vật lý thực tế!

### Luồng 3: Máy trạng thái Auto/Manual (State Machine)
- Mặc định khởi động ESP sẽ ở chế độ Auto. Nó theo dõi chân LDR, nếu phát hiện mức sáng > 2500 (sáng chói) nó tự đóng rèm, nếu mức sáng < 1000 (tối) nó tự mở rèm.
- Khi người dùng trên Web bấm nút Mở/Đóng rèm hoặc gạt công tắc sang Manual, một lệnh can thiệp ưu tiên được gởi xuống ESP.
- Khi đó ESP cập nhật biến cờ hiệu `isAutoMode = false`, phớt lờ hoàn toàn cảm biến ánh sáng và chỉ nghe theo thao tác tay cho tới khi được Web ra lệnh gạt lại về Auto.
