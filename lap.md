# Hướng dẫn lắp mạch: HỆ THỐNG MÁY CHO ĂN (Bản Chuẩn Cuối)

Đây là sơ đồ đấu nối tối ưu nhất sử dụng Arduino Uno làm "người làm" (đọc cảm biến) và NodeMCU làm "ông chủ" (WiFi).

## 1. Kết nối Nguồn và Mass (GND)
*   **GND:** Nối chân **GND** của Uno trực tiếp sang chân **GND** của NodeMCU.
*   **Nguồn:** Cả 2 mạch cắm vào cổng USB (hoặc Uno cắm sạc dự phòng).

---

## 2. Giao tiếp giữa 2 mạch (Serial)
Chúng ta dùng 1 điện trở để bảo vệ chân ESP8266.

*   **Chiều gửi lệnh (NodeMCU -> Uno):**
    *   Nối dây trực tiếp từ chân **D1 (NodeMCU)** sang chân **Pin 2 (Uno)**.
*   **Chiều báo cáo (Uno -> NodeMCU):**
    *   Nối chân **Pin 3 (Uno)** vào một đầu **Điện trở 10k**.
    *   Đầu kia của điện trở nối vào chân **D2 (NodeMCU)**.

---

## 3. Lắp bộ cân (Loadcell + HX711) - Nối vào Uno
*   **Dây Loadcell vào HX711:** Đỏ (E+), Đen (E-), Trắng (A-), Xanh (A+).
*   **Chân HX711 sang Uno:**
    *   **VCC** $\rightarrow$ Uno **5V**.
    *   **GND** $\rightarrow$ Uno **GND**.
    *   **DT**  $\rightarrow$ Uno **Pin 4**.
    *   **SCK** $\rightarrow$ Uno **Pin 5**.

---

## 4. Bảng tổng kết cắm dây nhanh

| Từ thiết bị (Chân) | Qua linh kiện | Đến thiết bị (Chân) |
| :--- | :--- | :--- |
| Uno GND | Dây thẳng | NodeMCU GND |
| NodeMCU D1 | Dây thẳng | Uno Pin 2 |
| Uno Pin 3 | **Điện trở 10k** | NodeMCU D2 |
| HX711 VCC | Dây thẳng | Uno 5V |
| HX711 GND | Dây thẳng | Uno GND |
| HX711 DT | Dây thẳng | Uno Pin 4 |
| HX711 SCK | Dây thẳng | Uno Pin 5 |

---

## 5. Các bước nạp code và kiểm tra
1. Nạp code **Sender** cho Uno.
2. Nạp code **Receiver** cho NodeMCU.
3. Mở Serial Monitor NodeMCU (115200 baud) để xem cân nặng.
4. Đèn LED trên Uno sẽ chớp tắt nếu nhận được lệnh từ NodeMCU.
