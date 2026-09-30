/*
 * SmartSol Hub - ESP32 IoT Firmware
 * Reads: Battery SoC, Voltage, Temp, Solar Power, Load Power
 * Publishes to: AWS IoT Core via MQTT over TLS
 * GPS: NEO-6M module via Serial2
 */

#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <TinyGPS++.h>
#include <HardwareSerial.h>

// --- Configuration ---
#define WIFI_SSID       "YOUR_WIFI_SSID"
#define WIFI_PASSWORD   "YOUR_WIFI_PASSWORD"
#define UNIT_ID         "UNIT_SERIAL_NUMBER"
#define MQTT_BROKER     "YOUR_IOT_ENDPOINT.iot.af-south-1.amazonaws.com"
#define MQTT_PORT       8883

// Analog pins
#define PIN_BATTERY_VOLTAGE   34
#define PIN_BATTERY_TEMP      35
#define PIN_SOLAR_CURRENT     32
#define PIN_LOAD_CURRENT      33
#define SOLAR_VOLTAGE         12.0f  // Fixed panel voltage reference

// GPS Serial
#define GPS_RX_PIN  16
#define GPS_TX_PIN  17

// Publish intervals
#define TELEMETRY_INTERVAL_MS   30000   // 30 seconds
#define GPS_INTERVAL_MS         300000  // 5 minutes

// AWS IoT certificates (paste PEM content)
extern const char AWS_CERT_CA[];
extern const char AWS_CERT_CRT[];
extern const char AWS_PRIVATE_KEY[];

WiFiClientSecure net;
PubSubClient mqtt(net);
TinyGPSPlus gps;
HardwareSerial gpsSerial(2);

unsigned long lastTelemetry = 0;
unsigned long lastGps = 0;
float dailyYieldKwh = 0.0f;

void connectWifi() {
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting WiFi");
  while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print("."); }
  Serial.println(" Connected: " + WiFi.localIP().toString());
}

void connectMqtt() {
  net.setCACert(AWS_CERT_CA);
  net.setCertificate(AWS_CERT_CRT);
  net.setPrivateKey(AWS_PRIVATE_KEY);
  mqtt.setServer(MQTT_BROKER, MQTT_PORT);
  mqtt.setBufferSize(512);

  Serial.print("Connecting MQTT");
  while (!mqtt.connected()) {
    if (mqtt.connect(UNIT_ID)) {
      Serial.println(" Connected to AWS IoT");
      // Subscribe to commands (e.g., remote load control)
      mqtt.subscribe(("smartsol/" + String(UNIT_ID) + "/cmd").c_str());
    } else {
      Serial.print(".");
      delay(2000);
    }
  }
}

float readBatteryVoltage() {
  int raw = analogRead(PIN_BATTERY_VOLTAGE);
  // Voltage divider: 100k/10k -> multiply by 12.1 for 12V system
  return (raw / 4095.0f) * 3.3f * 12.1f;
}

float readBatteryTemp() {
  int raw = analogRead(PIN_BATTERY_TEMP);
  // NTC thermistor conversion (simplified)
  float voltage = (raw / 4095.0f) * 3.3f;
  return (voltage - 0.5f) * 100.0f;
}

float readSolarPower() {
  int raw = analogRead(PIN_SOLAR_CURRENT);
  float current = (raw / 4095.0f) * 20.0f; // 0-20A range
  return current * SOLAR_VOLTAGE;
}

float readLoadPower() {
  int raw = analogRead(PIN_LOAD_CURRENT);
  float current = (raw / 4095.0f) * 20.0f;
  return current * readBatteryVoltage();
}

float voltageToBatterySoc(float voltage) {
  // LiFePO4 12V SoC curve (approximate)
  if (voltage >= 13.6f) return 100.0f;
  if (voltage >= 13.3f) return 90.0f;
  if (voltage >= 13.1f) return 70.0f;
  if (voltage >= 12.8f) return 50.0f;
  if (voltage >= 12.5f) return 30.0f;
  if (voltage >= 12.0f) return 10.0f;
  return 0.0f;
}

void publishTelemetry() {
  float voltage = readBatteryVoltage();
  float temp    = readBatteryTemp();
  float solar   = readSolarPower();
  float load    = readLoadPower();
  float soc     = voltageToBatterySoc(voltage);

  // Accumulate daily yield
  dailyYieldKwh += (solar * (TELEMETRY_INTERVAL_MS / 1000.0f)) / 3600000.0f;

  StaticJsonDocument<256> doc;
  doc["battery_soc"]      = soc;
  doc["battery_voltage"]  = voltage;
  doc["battery_temp"]     = temp;
  doc["solar_power_w"]    = solar;
  doc["load_power_w"]     = load;
  doc["daily_yield_kwh"]  = dailyYieldKwh;
  doc["grid_status"]      = "off_grid";

  char buf[256];
  serializeJson(doc, buf);
  mqtt.publish(("smartsol/" + String(UNIT_ID) + "/telemetry").c_str(), buf);
}

void publishGps() {
  while (gpsSerial.available()) gps.encode(gpsSerial.read());

  if (gps.location.isValid()) {
    StaticJsonDocument<128> doc;
    doc["latitude"]  = gps.location.lat();
    doc["longitude"] = gps.location.lng();
    doc["altitude"]  = gps.altitude.meters();
    doc["satellites"] = gps.satellites.value();

    char buf[128];
    serializeJson(doc, buf);
    mqtt.publish(("smartsol/" + String(UNIT_ID) + "/location").c_str(), buf);
  }
}

void setup() {
  Serial.begin(115200);
  gpsSerial.begin(9600, SERIAL_8N1, GPS_RX_PIN, GPS_TX_PIN);
  connectWifi();
  connectMqtt();
}

void loop() {
  if (!mqtt.connected()) connectMqtt();
  mqtt.loop();

  unsigned long now = millis();

  if (now - lastTelemetry >= TELEMETRY_INTERVAL_MS) {
    publishTelemetry();
    lastTelemetry = now;
  }

  if (now - lastGps >= GPS_INTERVAL_MS) {
    publishGps();
    lastGps = now;
  }

  // Reset daily yield at midnight
  if (now % 86400000 < TELEMETRY_INTERVAL_MS) dailyYieldKwh = 0.0f;
}
