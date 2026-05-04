#include <ESP8266WiFi.h>
#include <WiFiUdp.h>
#include <coap-simple.h>

// 1. Cấu hình WiFi
const char* ssid     = "ADMIN-PC 6954";
const char* password = "886!e1R1";
IPAddress backendIP(192, 168, 2, 126); 

WiFiUDP udp;
Coap coap(udp);

// 2. Chân kết nối cho ULN2003 (Động cơ 28BYJ-48)
#define IN1 5  // D1
#define IN2 4  // D2
#define IN3 0  // D3
#define IN4 2  // D4

// Chân Siêu âm
#define TRIG_PIN 14 // D5
#define ECHO_PIN 12 // D6

// Ma trận bước (Half-step 8 bước để quay mượt hơn)
int steps[8][4] = {
  {1,0,0,0}, {1,1,0,0}, {0,1,0,0}, {0,1,1,0},
  {0,0,1,0}, {0,0,1,1}, {0,0,0,1}, {1,0,0,1}
};

void writeStep(int s1, int s2, int s3, int s4) {
  digitalWrite(IN1, s1); digitalWrite(IN2, s2);
  digitalWrite(IN3, s3); digitalWrite(IN4, s4);
}

// Hàm xoay cửa (open=true: mở, open=false: đóng)
void rotateGate(bool open) {
    // 28BYJ-48 cần ~4096 bước cho 1 vòng 360 độ.
    // Xoay 90 độ cần ~1024 bước (tương đương 128 lần lặp của chu kỳ 8 bước)
    for (int i = 0; i < 128; i++) {
        for (int j = 0; j < 8; j++) {
            int stepIdx = open ? j : (7 - j);
            writeStep(steps[stepIdx][0], steps[stepIdx][1], steps[stepIdx][2], steps[stepIdx][3]);
            delayMicroseconds(1000); // Tốc độ quay
        }
        yield();
    }
    // Sau khi quay xong phải ngắt điện các cuộn dây để tránh nóng driver/động cơ
    writeStep(0, 0, 0, 0);
}

void processFeeding() {
    Serial.println(">> Đang mở cửa nhả hạt...");
    rotateGate(true);
    
    delay(2000); // Đợi 2 giây cho hạt rơi
    
    Serial.println(">> Đang đóng cửa...");
    rotateGate(false);
    
    Serial.println(">> Hoàn thành!");
    coap.put(backendIP, 5683, "status", "fed");
}

void callback_response(CoapPacket &packet, IPAddress ip, int port) {
    char p[packet.payloadlen + 1];
    memcpy(p, packet.payload, packet.payloadlen);
    p[packet.payloadlen] = '\0';
    String cmd = String(p);

    if (cmd == "feed") {
        processFeeding();
    }
}

long getDistance() {
    digitalWrite(TRIG_PIN, LOW); delayMicroseconds(2);
    digitalWrite(TRIG_PIN, HIGH); delayMicroseconds(10);
    digitalWrite(TRIG_PIN, LOW);
    long duration = pulseIn(ECHO_PIN, HIGH);
    return duration * 0.034 / 2;
}

void setup() {
    Serial.begin(115200);
    
    pinMode(IN1, OUTPUT); pinMode(IN2, OUTPUT);
    pinMode(IN3, OUTPUT); pinMode(IN4, OUTPUT);
    pinMode(TRIG_PIN, OUTPUT); pinMode(ECHO_PIN, INPUT);

    WiFi.begin(ssid, password);
    Serial.print("\nConnecting WiFi");
    while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print("."); }
    Serial.println("\nWiFi Connected!");

    coap.response(callback_response);
    coap.start();
}

void loop() {
    coap.loop();
    
    static unsigned long lastSensor = 0;
    if (millis() - lastSensor > 5000) {
        lastSensor = millis();
        long dist = getDistance();
        if (dist > 0 && dist < 400) {
            String dStr = String(dist);
            coap.put(backendIP, 5683, "sensor", dStr.c_str());
        }
    }

    static unsigned long lastCmd = 0;
    if (millis() - lastCmd > 1000) {
        lastCmd = millis();
        coap.get(backendIP, 5683, "command");
    }
}