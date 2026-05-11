#include <ESP8266WiFi.h>
#include <WiFiUdp.h>
#include <coap-simple.h>
#include <time.h>        // Thư viện lấy giờ từ Internet
#include <Wire.h>
#include "HX711.h"

// --- CẤU HÌNH WIFI & COAP ---
const char* ssid     = "Anh Bìu iu em";
const char* password = "Phong2343";
IPAddress backendIP(172, 20, 10, 6); 

WiFiUDP udp;
Coap coap(udp);

// --- CẤU HÌNH CHÂN ---
const int LOADCELL_SCK_PIN = D1; // Giữ nguyên
const int LOADCELL_DOUT_PIN = D2;// Giữ nguyên
const int TRIGGER_PIN = D3;      // Ra lệnh cho Uno
const int PIR_PIN = D7;          // Cảm biến chuyển động

HX711 scale;

// --- BIẾN LOGIC ---
int targetWeight = 10; // Thêm biến toàn cục để App có thể đổi số gam
int scheduledHour = 7;
int scheduledMinute = 30;
bool isManualFeedRequested = false; // Cờ yêu cầu cho ăn từ App
int manualFeedTargetWeight = 10;    // Số gam cho ăn thủ công riêng biệt
bool hasFedScheduled = false;       // Cờ đánh dấu đã cho ăn trong khung giờ hẹn này

// Hàm xử lý lệnh từ App gửi xuống (CoAP)
void callback_response(CoapPacket &packet, IPAddress ip, int port) {
    char p[packet.payloadlen + 1];
    memcpy(p, packet.payload, packet.payloadlen);
    p[packet.payloadlen] = '\0';
    String payload = String(p);

    // Xử lý gói tin schedule: "HH:MM:TARGET"
    if (payload.indexOf(':') > 0 && payload.indexOf(':', payload.indexOf(':') + 1) > 0) {
        int firstColon = payload.indexOf(':');
        int secondColon = payload.indexOf(':', firstColon + 1);
        scheduledHour = payload.substring(0, firstColon).toInt();
        scheduledMinute = payload.substring(firstColon + 1, secondColon).toInt();
        targetWeight = payload.substring(secondColon + 1).toInt();
        Serial.println(">> Đã cập nhật lịch: " + payload);
    } else if (payload.startsWith("feed")) {
        if (payload.indexOf(':') > 0) {
            manualFeedTargetWeight = payload.substring(payload.indexOf(':') + 1).toInt();
        } else {
            manualFeedTargetWeight = 10; // Mặc định nếu không có số
        }
        Serial.print(">> NHAN LENH CHO AN TU APP! Muc tieu: ");
        Serial.print(manualFeedTargetWeight); Serial.println("g");
        isManualFeedRequested = true;
    }
}

void setup() {
  Serial.begin(115200);
  
  pinMode(TRIGGER_PIN, OUTPUT);
  // Đổi mặc định thành HIGH để dùng tính năng chống nhiễu của Uno
  digitalWrite(TRIGGER_PIN, HIGH); 
  pinMode(PIR_PIN, INPUT);
  
  // 1. Khởi tạo Loadcell ở D1, D2
  scale.begin(LOADCELL_DOUT_PIN, LOADCELL_SCK_PIN);
  scale.set_scale(-396.f); // Hệ số chuẩn của bạn
  scale.tare(); 
  
  // Khởi tạo WiFi
  Serial.print("Dang ket noi WiFi");
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi Connected! IP: " + WiFi.localIP().toString());

  // LẤY GIỜ TỪ INTERNET (NTP) - Múi giờ Việt Nam là +7 (7 * 3600)
  configTime(7 * 3600, 0, "pool.ntp.org", "time.nist.gov");
  Serial.println("Dang doi dong bo gio tu Internet...");
  while (time(nullptr) < 100000) { // Đợi cho đến khi nhận được giờ chuẩn
    delay(500);
    Serial.print("*");
  }
  Serial.println("\nDong bo thoi gian thanh cong!");

  // Khởi tạo CoAP
  coap.response(callback_response);
  coap.start();
  coap.put(backendIP, 5683, "status", "online");

  Serial.println("ESP8266: He thong da san sang!");
}

void loop() {
  coap.loop(); // Duy trì kết nối mạng

  // --- Lấy giờ từ Internet (NTP) ---
  time_t now = time(nullptr);
  struct tm* ptm = localtime(&now);
  int currentHour = ptm->tm_hour;
  int currentMinute = ptm->tm_min;
  
  // --- Đọc Cân ---
  long weight = 0;
  if (scale.is_ready()) {
    weight = scale.get_units(5); 
    if (weight < 2 && weight > -2) weight = 0; 
  }

  // --- Tính toán Khung giờ (Sớm/Trễ 30 phút) ---
  int nowInMinutes = currentHour * 60 + currentMinute;
  int schedInMinutes = scheduledHour * 60 + scheduledMinute;
  int diff = nowInMinutes - schedInMinutes;
  bool isWithinWindow = (diff >= -30 && diff <= 30);

  // --- Đọc PIR ---
  if (digitalRead(PIR_PIN) == HIGH) {
    if (!isWithinWindow) {
      Serial.println("PIR: Phat hien thu cung nhung CHUA TOI GIO cho an (Ngoai khung +/- 30p).");
    } else if (hasFedScheduled) {
      Serial.println("PIR: Trong khung gio nhung DA CHO AN ROI, khong cho an nua.");
    } else {
      // Nằm trong khung giờ cho ăn và CHƯA CHO ĂN
      if (weight < targetWeight) {
        Serial.println("PIR: Thu cung o gan, DUNG GIO, va bat rong! -> CHO AN");
        fee1dPet(targetWeight);     
        hasFedScheduled = true; // Đánh dấu đã cho ăn xong khung giờ này
      } else {
        Serial.println("PIR: Phat hien thu cung, DUNG GIO, nhung bat VAN DAY thuc an.");
      }
    }
    delay(5000);   // Nghỉ 5 giây để tránh nhiễu
  }

  // Reset cờ hasFedScheduled khi ra ngoài khung giờ hẹn để chuẩn bị cho lần sau
  if (!isWithinWindow) {
      hasFedScheduled = false;
  }

  // In log ra màn hình
  Serial.print(currentHour); Serial.print(":"); Serial.print(currentMinute);
  Serial.print(" | Can nang: "); Serial.print(weight); Serial.println("g");
  
  // Gửi cân nặng lên App mỗi 2 giây
  static unsigned long lastSensor = 0;
  if (millis() - lastSensor > 2000) { 
      lastSensor = millis();
      String dStr = "W:" + String(weight);
      coap.put(backendIP, 5683, "sensor", dStr.c_str());
  }

  // Lắng nghe lệnh từ App mỗi 3 giây
  static unsigned long lastCmd = 0;
  if (millis() - lastCmd > 3000) {
      lastCmd = millis();
      coap.get(backendIP, 5683, "command"); 
      coap.get(backendIP, 5683, "schedule"); // Lấy cả lịch trình và số gam từ backend
  }

  // --- Xử lý lệnh cho ăn thủ công từ App ---
  if (isManualFeedRequested) {
      feedPet(manualFeedTargetWeight); 
      coap.put(backendIP, 5683, "status", "fed_success");
      isManualFeedRequested = false; // Reset cờ
  }

  delay(100); // Đổi từ 2000 xuống 100 để mạng CoAP không bị giật lag
}

void feedPet(int weightLimit) {
  Serial.print("BAT DAU CHO AN! Mo cua xa hat... Muc tieu: ");
  Serial.print(weightLimit); Serial.println("g");
  unsigned long startTime = millis();
  
  // 1. RA LỆNH MỞ CỬA (Kéo điện xuống mức LOW để kích hoạt Uno)
  digitalWrite(TRIGGER_PIN, LOW); 
  
  while (true) {
    // Đọc cân hiện tại
    long currentWeight = 0;
    if (scale.is_ready()) {
      currentWeight = scale.get_units(5);
    }
    
    // Nếu đã đổ đủ số gam mong muốn -> Thoát để đóng cửa
    if (currentWeight >= weightLimit) {
      Serial.println(">> Da du thuc an trong bat! Dong cua lai.");
      break; 
    }
    
    // Bảo vệ: Nếu sau 40 giây vẫn không đủ hạt (kẹt máy / hết hạt) thì phải dừng để tránh hỏng động cơ
    if (millis() - startTime > 40000) {
      Serial.println(">> LOI: Het hat hoac bi ket dong co! Dong cua an toan.");
      break;
    }
    
    // Chưa đủ hạt thì cứ giữ cửa mở và đợi hạt rơi
    delay(500); 
    coap.loop(); // Giữ kết nối mạng
  }
  
  // 2. RA LỆNH ĐÓNG CỬA (Kéo điện lên HIGH để Uno nghỉ)
  digitalWrite(TRIGGER_PIN, HIGH);  
  delay(2000); // Đợi 2 giây cho Uno thực hiện việc quay ngược đóng cửa
}