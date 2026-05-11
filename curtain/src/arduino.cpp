#include <Stepper.h>

const int TRIGGER_IN_PIN = 3; // Chân nhận tín hiệu từ D3 của ESP
const int stepsPerRev = 2048; 
Stepper myStepper(stepsPerRev, A0, A2, A1, A3); // IN1=A0, IN2=A1, IN3=A2, IN4=A3

bool isGateOpen = false; // Nhớ trạng thái của cửa

// Hàm tắt điện động cơ để chống quá nhiệt
void stopMotorPower() {
  digitalWrite(A0, LOW);
  digitalWrite(A1, LOW);
  digitalWrite(A2, LOW);
  digitalWrite(A3, LOW);
}

void setup() {
  Serial.begin(9600);
  // DÙNG INPUT_PULLUP ĐỂ CHỐNG NHIỄU (Mặc định sẽ là HIGH khi không có tín hiệu)
  pinMode(TRIGGER_IN_PIN, INPUT_PULLUP);
  
  // Thiết lập các chân động cơ
  pinMode(A0, OUTPUT); pinMode(A1, OUTPUT);
  pinMode(A2, OUTPUT); pinMode(A3, OUTPUT);
  
  myStepper.setSpeed(10); 
  stopMotorPower(); // Tắt điện khi mới bật máy
  
  Serial.println("Uno: He thong cua san sang. Doi ESP...");
}

void loop() {
  int triggerState = digitalRead(TRIGGER_IN_PIN);
  
  // 1. ESP RA LỆNH MỞ CỬA (Kéo xuống LOW)
  if (triggerState == LOW && !isGateOpen) {
    Serial.println("Uno: NHAN LENH MO CUA!");
    myStepper.step(1024); // Quay 180 độ (nửa vòng) để mở
    isGateOpen = true;
    stopMotorPower();     // Tắt dòng điện giữ để chống nóng motor
  }
  
  // 2. ESP RA LỆNH ĐÓNG CỬA (Trở về HIGH)
  if (triggerState == HIGH && isGateOpen) {
    Serial.println("Uno: NHAN LENH DONG CUA!");
    myStepper.step(-1024); // Quay ngược lại -180 độ để đóng chặt
    isGateOpen = false;
    stopMotorPower();      // Tắt dòng điện giữ
  }
}