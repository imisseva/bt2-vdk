#include <ESP8266WiFi.h>
#include <WiFiUdp.h>
#include <coap-simple.h>
#include "HX711.h"
#include "RTClib.h"

// 1. Cấu hình WiFi
const char* ssid     = "Sam Sum";
const char* password = "24082003";
IPAddress backendIP(192, 168, 8, 102); 

WiFiUDP udp;
Coap coap(udp);

// 2. Chân kết nối cho ULN2003 (Động cơ 28BYJ-48)
// Tương thích I2C, RTC dùng D1(SCL) D2(SDA). 
#define STEP_IN1 0   // D3
#define STEP_IN2 2   // D4
#define STEP_IN3 13  // D7
#define STEP_IN4 15  // D8

// Chân Loadcell & PIR
#define LOADCELL_DOUT 14 // D5
#define LOADCELL_SCK 12  // D6
#define PIR_PIN 16       // D0

// 3. Khởi tạo đối tượng
HX711 scale;
RTC_DS1307 rtc;

// Biến trạng thái
float calibration_factor = 420.0;
int scheduledHour = 7;
int scheduledMinute = 30;
int targetWeight = 10;
bool hasFedToday = false;

// Ma trận bước
int steps[8][4] = {
  {1,0,0,0}, {1,1,0,0}, {0,1,0,0}, {0,1,1,0},
  {0,0,1,0}, {0,0,1,1}, {0,0,0,1}, {1,0,0,1}
};

void writeStep(int s1, int s2, int s3, int s4) {
  digitalWrite(STEP_IN1, s1); digitalWrite(STEP_IN2, s2);
  digitalWrite(STEP_IN3, s3); digitalWrite(STEP_IN4, s4);
}

void rotateGate(bool open) {
    // 28BYJ-48 quay 180 độ cần ~2048 bước (256 lần chu kỳ 8 bước)
    for (int i = 0; i < 256; i++) {
        for (int j = 0; j < 8; j++) {
            int stepIdx = open ? j : (7 - j);
            writeStep(steps[stepIdx][0], steps[stepIdx][1], steps[stepIdx][2], steps[stepIdx][3]);
            delayMicroseconds(1000); 
        }
        yield();
    }
    writeStep(0, 0, 0, 0);
}

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
    } else if (payload == "feed") {
        // Hỗ trợ lệnh feed thủ công
        rotateGate(true);
        delay(2000);
        rotateGate(false);
        coap.put(backendIP, 5683, "status", "fed_success");
    }
}

void setup() {
    Serial.begin(115200);
    
    pinMode(STEP_IN1, OUTPUT); pinMode(STEP_IN2, OUTPUT);
    pinMode(STEP_IN3, OUTPUT); pinMode(STEP_IN4, OUTPUT);
    pinMode(PIR_PIN, INPUT);

    scale.begin(LOADCELL_DOUT, LOADCELL_SCK);
    scale.set_scale(calibration_factor);
    scale.tare();

    if (!rtc.begin()) { 
        Serial.println("Không tìm thấy module RTC"); 
    } else {
        if (!rtc.isrunning()) {
            Serial.println("RTC chưa chạy, cài đặt giờ tự động!");
            rtc.adjust(DateTime(F(__DATE__), F(__TIME__)));
        }
    }

    WiFi.begin(ssid, password);
    Serial.print("\nConnecting WiFi");
    while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print("."); }
    Serial.println("\nWiFi Connected!");
    Serial.print("ESP IP Address: ");
    Serial.println(WiFi.localIP());

    coap.response(callback_response);
    coap.start();
}

void loop() {
    coap.loop();
    
    DateTime now = rtc.now();
    
    // 1. Tính toán khung giờ
    long nowInMinutes = now.hour() * 60 + now.minute();
    long scheduledInMinutes = scheduledHour * 60 + scheduledMinute;
    
    bool inWindow = (nowInMinutes >= scheduledInMinutes - 10) && 
                    (nowInMinutes <= scheduledInMinutes + 60);

    // 2. Logic nghiệp vụ
    if (inWindow && !hasFedToday) {
        if (digitalRead(PIR_PIN) == HIGH) {
            Serial.println(">> Phát hiện mèo! Đang kiểm tra bát ăn...");
            
            float currentWeight = scale.get_units(5);
            if (currentWeight < targetWeight) {
                Serial.println(">> Thiếu thức ăn. Đang mở cửa...");
                rotateGate(true); // Mở 180 độ
                
                unsigned long feedStartTime = millis();
                while (scale.get_units(5) < targetWeight) {
                    if (millis() - feedStartTime > 20000) {
                        Serial.println(">> Timeout chờ hạt rơi!");
                        break;
                    }
                    delay(100);
                }
                
                rotateGate(false); // Đóng 180 độ
                Serial.println(">> Đã xong!");
            }
            hasFedToday = true;
            coap.put(backendIP, 5683, "status", "fed_success");
        }
    }

    if (!inWindow) { hasFedToday = false; }

    // 3. Gửi dữ liệu định kỳ
    static unsigned long lastSensor = 0;
    if (millis() - lastSensor > 2000) { 
        lastSensor = millis();
        
        // Đo cân nặng
        float weight = scale.get_units(5);
        if (weight < 0) weight = 0;
        
        String dStr = "W:" + String(weight, 1);
        coap.put(backendIP, 5683, "sensor", dStr.c_str());
    }

    // 4. Lấy lịch định kỳ
    static unsigned long lastSched = 0;
    if (millis() - lastSched > 10000) { // Mỗi 10s lấy lại lịch
        lastSched = millis();
        coap.get(backendIP, 5683, "schedule");
        coap.get(backendIP, 5683, "command"); // Vẫn lấy command thủ công
    }
}
