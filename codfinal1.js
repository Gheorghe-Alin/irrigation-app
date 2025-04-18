#include <WiFi.h>
#include <WebServer.h>

// 🔹 Date Wi-Fi
const char* ssid = "Sala Sedinte INSPET";
const char* password = "ynsdem016";

// 🔹 ESP32 Web Server pe portul 80
WebServer server(80);

// 🔹 Pinii GPIO pentru robineți (REDUS la 8 robineți)
const int valves[] = {5, 12, 13, 14, 16, 17, 18, 19, 21, 22, 23, 25, 26, 27, 32, 33}; // 16 robineți activi
// const int rainSensorPin = 34;  // Pinul pentru senzorul de ploaie

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

// 🔹 Endpoint pentru returnarea istoricului
void handleLogs() {
  String json = "[";
  for (int i = 0; i < MAX_LOGS; i++) {
    json += "{";
    json += "\"valveIndex\":" + String(logs[i].valveIndex) + ",";
    json += "\"state\":" + String(logs[i].state ? "true" : "false") + ",";
    json += "\"timestamp\":" + String(logs[i].timestamp);
    json += "}";

    if (i < MAX_LOGS - 1) json += ",";
  }
  json += "]";

  server.sendHeader("Access-Control-Allow-Origin", "*");  // 🔥 Fix CORS
  server.send(200, "application/json", json);
}





// 🔹 Control Robinet Individual cu Debugging Extins
void handleToggleValve() {
  if (server.hasArg("index") && server.hasArg("state")) {
    int index = server.arg("index").toInt();
    bool requestedState = server.arg("state") == "1";

    if (index >= 0 && index < 16) { // Doar 8 robineți
      bool currentState = digitalRead(valves[index]) == LOW;

      if (requestedState != currentState) {
        digitalWrite(valves[index], requestedState ? LOW : HIGH);
        addLog(index, requestedState);
      } else {
        // Eliminat mesajul de "stare deja cerută"
      }

      delay(100); // Evită fluctuațiile rapide
      server.sendHeader("Access-Control-Allow-Origin", "*");
      server.send(200, "text/plain", "Valve toggled successfully");
    } else {
      server.send(400, "text/plain", "Invalid valve index");
    }
  } else {
    server.send(400, "text/plain", "Missing parameters");
  }
}


// 🔹 Control Toți Robineții Simultan
void handleToggleAll() {
  if (server.hasArg("state")) {
    bool state = server.arg("state") == "1";

    Serial.print("Schimbare stare pentru toți robineții: ");
    Serial.println(state ? "ON" : "OFF");

    for (int i = 0; i < 16; i++) { // Doar 8 robineți acum
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
// 🔹 Endpoint pentru citirea stării robineților
void handleValveStatus() {
  String json = "{ \"valves\": [";
  for (int i = 0; i < 16; i++) { // Doar 8 robineți
    int valveState = digitalRead(valves[i]) == LOW ? 1 : 0;
    json += String(valveState);

    if (i < 15) json += ",";
  }
  json += "]}";

  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(200, "application/json", json);
}

void handleClearLogs() {
  for (int i = 0; i < MAX_LOGS; i++) {
    logs[i] = {0, false, 0};
  }
  logIndex = 0;
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(200, "text/plain", "Loguri șterse");
}

// 🔹 Endpoint pentru citirea senzorului de ploaie
// void handleRainSensor() {
//   bool isRaining = digitalRead(rainSensorPin) == LOW;

//   Serial.print("🌧 Stare senzor de ploaie: ");
//   Serial.println(isRaining ? "PLOAIE DETECTATĂ" : "USCAT");

//   String json = "{\"isRaining\":" + String(isRaining ? "true" : "false") + "}";

//   if (isRaining) {
//     Serial.println("⚠️ Ploaie detectată! Oprire automată a robineților.");
//     for (int i = 0; i < 8; i++) {
//       digitalWrite(valves[i], HIGH);
//       Serial.print("❌ Oprit R");
//       Serial.println(i + 1);
//       addLog(i, false);
//     }
//   }

//   server.sendHeader("Access-Control-Allow-Origin", "*");
//   server.send(200, "application/json", json);
// }

// 🔹 Setup ESP32
void setup() {
  Serial.begin(115200);
  server.on("/logs", handleLogs);
  server.on("/clear-logs", handleClearLogs);


  for (int i = 0; i < 16; i++) { // Inițializăm doar 8 robineți
    pinMode(valves[i], OUTPUT);
    digitalWrite(valves[i], HIGH);
  }

  // pinMode(rainSensorPin, INPUT_PULLUP);

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
  // server.on("/rain-sensor", handleRainSensor);

  server.begin();
  Serial.println("Serverul rulează...");
}

// 🔹 Loop - Ascultă cereri HTTP
void loop() {
  server.handleClient();
}