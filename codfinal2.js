#include <WiFi.h>
#include <WebServer.h>
#include <WebSocketsServer.h>

// 🔹 Config Wi-Fi
const char* ssid = "Sala Sedinte INSPET";
const char* password = "ynsdem016";

WebServer server(80);
WebSocketsServer webSocket = WebSocketsServer(81);

// 🔹 Robineți
const int valves[] = {5, 12, 13, 14, 16, 17, 18, 19, 21, 22, 23, 25, 26, 27, 32, 33}; // 16 robineți activi

// 🔹 Structură loguri
struct LogEntry {
  int valveIndex;
  bool state;
  unsigned long timestamp;
};

#define MAX_LOGS 100
LogEntry logs[MAX_LOGS];
int logIndex = 0;

// 🔹 Trimite log WebSocket + salvează
void addLog(int index, bool state) {
  logs[logIndex] = {index, state, millis()};
  logIndex = (logIndex + 1) % MAX_LOGS;

  String message = "{";
  message += "\"valveIndex\":" + String(index) + ",";
  message += "\"state\":" + String(state ? "true" : "false") + ",";
  message += "\"timestamp\":" + String(millis());
  message += "}";

  webSocket.broadcastTXT(message);
  Serial.println("Trimis WebSocket: " + message);
}

// 🔹 Control robinet individual
void handleToggleValve() {
  if (server.hasArg("index") && server.hasArg("state")) {
    int index = server.arg("index").toInt();
    bool requestedState = server.arg("state") == "1";

    if (index >= 0 && index < 16) {
      bool currentState = digitalRead(valves[index]) == LOW;
      if (requestedState != currentState) {
        digitalWrite(valves[index], requestedState ? LOW : HIGH);
        addLog(index, requestedState);
      }
      delay(100);
      server.sendHeader("Access-Control-Allow-Origin", "*");
      server.send(200, "text/plain", "Valve toggled successfully");
    } else {
      server.send(400, "text/plain", "Invalid valve index");
    }
  } else {
    server.send(400, "text/plain", "Missing parameters");
  }
}

// 🔹 Control toți robineții
void handleToggleAll() {
  if (server.hasArg("state")) {
    bool state = server.arg("state") == "1";
    for (int i = 0; i < 16; i++) {
      digitalWrite(valves[i], state ? LOW : HIGH);
      addLog(i, state);
    }
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.send(200, "text/plain", "All valves toggled");
  } else {
    server.send(400, "text/plain", "Missing state parameter");
  }
}

// 🔹 Status robineți
void handleValveStatus() {
  String json = "{ \"valves\": [";
  for (int i = 0; i < 16; i++) {
    int valveState = digitalRead(valves[i]) == LOW ? 1 : 0;
    json += String(valveState);
    if (i < 15) json += ",";
  }
  json += "]}";

  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(200, "application/json", json);
}

// 🔹 WebSocket
void webSocketEvent(uint8_t num, WStype_t type, uint8_t * payload, size_t length) {
  if (type == WStype_TEXT) {
    Serial.printf("[WS] Primit de la client: %s\n", payload);
  }
}

// 🔹 Setup
void setup() {
  Serial.begin(115200);

  for (int i = 0; i < 16; i++) {
    pinMode(valves[i], OUTPUT);
    digitalWrite(valves[i], HIGH);
  }

  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.print(".");
  }

  Serial.println("Conectat!");
  Serial.println(WiFi.localIP());

  server.on("/toggle", handleToggleValve);
  server.on("/toggleAll", handleToggleAll);
  server.on("/valve-status", handleValveStatus);
  server.begin();

  webSocket.begin();
  webSocket.onEvent(webSocketEvent);
}

// 🔹 Loop
void loop() {
  server.handleClient();
  webSocket.loop();
}
