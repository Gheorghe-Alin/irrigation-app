#include <WiFi.h>
#include <WebServer.h>

// 🔹 Date Wi-Fi
const char* ssid = "Sala Sedinte INSPET";
const char* password = "ynsdem016";

// 🔹 ESP32 Web Server pe portul 80
WebServer server(80);

// 🔹 Pinii GPIO pentru robineți (REDUS la 8 robineți)
const int valves[] = {22, 21, 19, 18, 5, 17, 16, 4}; // 8 robineți activi
const int rainSensorPin = 23;  // Pinul pentru senzorul de ploaie

// 🔹 Structură pentru istoricul acțiunilor
struct LogEntry {
  int valveIndex;
  bool state;
  unsigned long timestamp;
};

#define MAX_LOGS 100
LogEntry logs[MAX_LOGS];
int logIndex = 0;

// 🔹 Salvare acțiune în istoric
void addLog(int index, bool state) {
  logs[logIndex] = {index, state, millis()};
  logIndex = (logIndex + 1) % MAX_LOGS;

  Serial.print("Log: Robinet R");
  Serial.print(index + 1);
  Serial.print(" -> ");
  Serial.println(state ? "ON" : "OFF");
}

// 🔹 Endpoint Root
void handleRoot() {
  server.sendHeader("Access-Control-Allow-Origin", "*");  
  server.send(200, "text/plain", "ESP32 Sistem de Irigații activ");
}

// 🔹 Control Robinet Individual cu Debugging Extins
void handleToggleValve() {
  if (server.hasArg("index") && server.hasArg("state")) {
    int index = server.arg("index").toInt();
    bool requestedState = server.arg("state") == "1";

    if (index >= 0 && index < 8) { // Doar 8 robineți
      bool currentState = digitalRead(valves[index]) == LOW;

      Serial.print("🔍 Comandă primită pentru R");
      Serial.print(index + 1);
      Serial.print(": ");
      Serial.println(requestedState ? "ON" : "OFF");

      if (requestedState != currentState) {
        digitalWrite(valves[index], requestedState ? LOW : HIGH);
        addLog(index, requestedState);
        Serial.print("✅ Stare schimbată pentru R");
        Serial.print(index + 1);
        Serial.print(": ");
        Serial.println(requestedState ? "ON" : "OFF");
      } else {
        Serial.print("❌ R");
        Serial.print(index + 1);
        Serial.println(" este deja în starea cerută!");
      }

      delay(100); // Evită fluctuațiile rapide
      server.sendHeader("Access-Control-Allow-Origin", "*");
      server.send(200, "text/plain", "Valve toggled successfully");
    } else {
      Serial.println("🚨 EROARE: Index invalid!");
      server.send(400, "text/plain", "Invalid valve index");
    }
  } else {
    Serial.println("🚨 EROARE: Parametri lipsă!");
    server.send(400, "text/plain", "Missing parameters");
  }
}

// 🔹 Control Toți Robineții Simultan
void handleToggleAll() {
  if (server.hasArg("state")) {
    bool state = server.arg("state") == "1";

    Serial.print("Schimbare stare pentru toți robineții: ");
    Serial.println(state ? "ON" : "OFF");

    for (int i = 0; i < 8; i++) { // Doar 8 robineți acum
      digitalWrite(valves[i], state ? LOW : HIGH);
      addLog(i, state);
    }

    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.send(200, "text/plain", "All valves toggled");
  } else {
    server.send(400, "text/plain", "Missing state parameter");
  }
}

// 🔹 Endpoint pentru citirea stării robineților
void handleValveStatus() {
  String json = "{ \"valves\": [";
  Serial.print("📊 Status robineți: ");
  for (int i = 0; i < 8; i++) { // Doar 8 robineți
    int valveState = digitalRead(valves[i]) == LOW ? 1 : 0;
    json += String(valveState);
    Serial.print("R");
    Serial.print(i + 1);
    Serial.print(": ");
    Serial.print(valveState ? "ON " : "OFF ");

    if (i < 7) json += ",";
  }
  json += "]}";
  Serial.println();

  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(200, "application/json", json);
}

// 🔹 Endpoint pentru citirea senzorului de ploaie
void handleRainSensor() {
  bool isRaining = digitalRead(rainSensorPin) == LOW;

  Serial.print("🌧 Stare senzor de ploaie: ");
  Serial.println(isRaining ? "PLOAIE DETECTATĂ" : "USCAT");

  String json = "{\"isRaining\":" + String(isRaining ? "true" : "false") + "}";

  if (isRaining) {
    Serial.println("⚠️ Ploaie detectată! Oprire automată a robineților.");
    for (int i = 0; i < 8; i++) {
      digitalWrite(valves[i], HIGH);
      Serial.print("❌ Oprit R");
      Serial.println(i + 1);
      addLog(i, false);
    }
  }

  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(200, "application/json", json);
}

// 🔹 Setup ESP32
void setup() {
  Serial.begin(115200);

  for (int i = 0; i < 8; i++) { // Inițializăm doar 8 robineți
    pinMode(valves[i], OUTPUT);
    digitalWrite(valves[i], HIGH);
  }

  pinMode(rainSensorPin, INPUT_PULLUP);

  WiFi.begin(ssid, password);
  Serial.print("Conectare la Wi-Fi...");
  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.print(".");
  }
  Serial.println(" Conectat!");
  Serial.print("Adresa IP: ");
  Serial.println(WiFi.localIP());

  server.on("/", handleRoot);
  server.on("/toggle", handleToggleValve);
  server.on("/toggleAll", handleToggleAll);
  server.on("/valve-status", handleValveStatus);
  server.on("/rain-sensor", handleRainSensor);

  server.begin();
  Serial.println("Serverul rulează...");
}

// 🔹 Loop - Ascultă cereri HTTP
void loop() {
  server.handleClient();
}