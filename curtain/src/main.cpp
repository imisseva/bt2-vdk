#include <WiFi.h>
#include <WiFiUdp.h>
#include <coap-simple.h>

// 1. Cấu hình WiFi ảo của Wokwi
const char* ssid     = "Wokwi-GUEST";
const char* password = "";

// 2. IP của Backend Node.js (máy tính thật của bạn)
IPAddress backendIP(172, 20, 10, 11); 

WiFiUDP udp;
Coap coap(udp);

// --- Cấu hình chân ESP32 theo Diagram của bạn ---
#define DIR_PIN 13
#define STEP_PIN 12
#define LDR_PIN 36 // Chân VP trên ESP32

// Biến lưu trạng thái rèm hiện tại
bool isCurtainOpen = false;
bool isAutoMode = true; // Lưu trạng thái chế độ Tự Động / Thủ Công

// Hàm điều khiển Stepper Motor (A4988)
void rotateCurtain(bool openCurtain) {
  // Kiểm tra trạng thái để tránh mở khi đã mở, đóng khi đã đóng
  if (openCurtain && isCurtainOpen) {
    Serial.println(">> Rèm đã được MỞ sẵn, bỏ qua lệnh!");
    return;
  }
  if (!openCurtain && !isCurtainOpen) {
    Serial.println(">> Rèm đã được ĐÓNG sẵn, bỏ qua lệnh!");
    return;
  }

  int steps = 1000; // Số bước mô phỏng để rèm kéo ra/vào (có thể tăng giảm)
  
  if (openCurtain) {
    digitalWrite(DIR_PIN, HIGH); // Chiều mở rèm
    Serial.println(">> Đang MỞ rèm (Motor đang quay ra)...");
  } else {
    digitalWrite(DIR_PIN, LOW); // Chiều đóng rèm
    Serial.println(">> Đang ĐÓNG rèm (Motor đang quay vào)...");
  }

  // Phát xung cho Stepper quay
  for (int i = 0; i < steps; i++) {
    digitalWrite(STEP_PIN, HIGH);
    delayMicroseconds(1000); // Tốc độ quay (càng nhỏ càng nhanh)
    digitalWrite(STEP_PIN, LOW);
    delayMicroseconds(1000);
  }
  
  // Cập nhật trạng thái
  isCurtainOpen = openCurtain;
  Serial.println(">> Hoàn thành kéo rèm! Báo cáo lên Backend...");
  
  // Gửi trạng thái về Backend
  String statusPayload = openCurtain ? "open" : "close";
  coap.put(backendIP, 5683, "status", statusPayload.c_str());
}

// --- Hàm xử lý khi Node.js trả lời câu hỏi của ESP ---
void callback_response(CoapPacket &packet, IPAddress ip, int port) {
  char p[packet.payloadlen + 1];
  memcpy(p, packet.payload, packet.payloadlen);
  p[packet.payloadlen] = '\0';
  String response = String(p);

  // Nếu Backend trả lời là "none" (không có ai bấm nút)
  if (response == "none") return;

  // Nếu có lệnh thực sự
  if (response == "open") {
    isAutoMode = false; // Bấm nút tay là ép về chế độ Manual luôn
    rotateCurtain(true);
  } 
  else if (response == "close") {
    isAutoMode = false; // Bấm nút tay là ép về chế độ Manual luôn
    rotateCurtain(false);
  }
  else if (response == "auto") {
    isAutoMode = true;
    Serial.println(">> Đã chuyển sang chế độ AUTO");
  }
  else if (response == "manual") {
    isAutoMode = false;
    Serial.println(">> Đã chuyển sang chế độ MANUAL");
  }
}

void setup() {
  Serial.begin(115200);
  
  // Khởi tạo chân Motor
  pinMode(DIR_PIN, OUTPUT);
  pinMode(STEP_PIN, OUTPUT);
  digitalWrite(DIR_PIN, LOW); 
  digitalWrite(STEP_PIN, LOW);

  // Kết nối WiFi
  WiFi.begin(ssid, password);
  Serial.println();
  Serial.print("Dang ket noi WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nDa ket noi WiFi!");
  Serial.print("IP ao cua ESP32: ");
  Serial.println(WiFi.localIP());

  // Đăng ký hàm nhận phản hồi
  coap.response(callback_response);
  coap.start();
  
  Serial.println("ESP32 san sang hoat dong (Polling Mode)!");
}

void loop() {
  coap.loop();

  // 1. LUỒNG SENSOR: Đọc giá trị Analog thật từ LDR và gửi mỗi 2 giây (để test nhanh hơn)
  static unsigned long lastSensorTime = 0;
  if (millis() - lastSensorTime > 2000) {
    lastSensorTime = millis();
    
    int ldrVal = analogRead(LDR_PIN); // Đọc độ sáng thực tế trong giả lập
    String payload = "Gia tri LDR: " + String(ldrVal);
    
    Serial.println("<< Gui du lieu: " + payload);
    coap.put(backendIP, 5683, "sensor", payload.c_str()); 

    // --- LOGIC AUTO: Đóng/Mở theo ánh sáng ---
    if (isAutoMode) {
      if (ldrVal > 2500 && isCurtainOpen) {
        Serial.println(">> [AUTO] Trời sáng chói, tự động ĐÓNG rèm!");
        rotateCurtain(false); 
      } else if (ldrVal < 1000 && !isCurtainOpen) {
        Serial.println(">> [AUTO] Trời tối, tự động MỞ rèm!");
        rotateCurtain(true); 
      }
    }
  }

  // 2. LUỒNG LẤY LỆNH (POLLING): Hỏi lệnh mỗi 1 giây
  static unsigned long lastCmdTime = 0;
  if (millis() - lastCmdTime > 1000) {
    lastCmdTime = millis();
    coap.get(backendIP, 5683, "command"); 
  }
}
