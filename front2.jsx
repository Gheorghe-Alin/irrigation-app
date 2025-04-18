import { useState, useEffect, useRef, useCallback } from "react";
import AreaControl from "./AreaControl";
import ValveControl from "./ValveControl";
import TimerControl from "./TimerControl";
// import ValveLogWindow from "./ValveLogWindow";
// import Senzor from "./Senzor";
import "./styles.css";

const ESP32_IP = "192.168.0.177";

export default function IrrigationSystem() {
  const [valves, setValves] = useState(() => {
    const savedValves = localStorage.getItem("valvesState");
    return savedValves ? JSON.parse(savedValves) : Array(16).fill(false);
  });

  const [startTime, setStartTime] = useState("");
  const [stopTime, setStopTime] = useState("");
  const [wsLogs, setWsLogs] = useState([]);
  const allOn = valves.every((valve) => valve);
  const ws = useRef(null);

  const sendToggleRequest = async (index, state) => {
    try {
      await fetch(
        `http://${ESP32_IP}/toggle?index=${index}&state=${state ? 1 : 0}`
      );
    } catch (error) {
      console.error("Eroare la trimiterea comenzii către ESP32:", error);
    }
  };

  const sendWebSocketToggle = useCallback((index, state) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(
        JSON.stringify({ action: "toggle", valveIndex: index, state })
      );
    } else {
      console.warn(
        "⚠️ WebSocket nu este conectat. Trimit cu fetch ca fallback."
      );
      sendToggleRequest(index, state);
    }
  }, []);

  const toggleAllValves = useCallback(
    (state) => {
      const updatedValves = Array(16).fill(state);
      setValves(updatedValves);
      localStorage.setItem("valvesState", JSON.stringify(updatedValves));
      for (let i = 0; i < 16; i++) {
        sendWebSocketToggle(i, state);
      }
    },
    [sendWebSocketToggle]
  );

  const resetTimer = () => {
    setStartTime("");
    setStopTime("");
    console.log("⏳ Timer resetat!");
  };

  const fetchValveStatus = async () => {
    try {
      const response = await fetch(`http://${ESP32_IP}/valve-status`);
      const data = await response.json();
      const updatedValves = data.valves.map((valve) => valve === 1);
      setValves(updatedValves);
      localStorage.setItem("valvesState", JSON.stringify(updatedValves));
    } catch (error) {
      console.error("Eroare la citirea stării robineților:", error);
    }
  };

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const currentTime = now.toTimeString().slice(0, 5);

      if (currentTime === startTime && !allOn) {
        console.log("⏳ Pornire automată a robineților!");
        toggleAllValves(true);
      }
      if (currentTime === stopTime && allOn) {
        console.log("⏳ Oprire automată a robineților!");
        toggleAllValves(false);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [startTime, stopTime, allOn, toggleAllValves]);

  useEffect(() => {
    localStorage.setItem("valvesState", JSON.stringify(valves));
  }, [valves]);

  useEffect(() => {
    const interval = setInterval(fetchValveStatus, 9000);
    return () => clearInterval(interval);
  }, []);

  // 🔌 WebSocket connection
  useEffect(() => {
    ws.current = new WebSocket(`ws://${ESP32_IP}:81`);

    ws.current.onopen = () => {
      console.log("✅ WebSocket conectat la ESP32");
    };

    ws.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const seconds = Math.floor(data.timestamp / 1000);
        const formatted = `${Math.floor(seconds / 60)}m ${seconds % 60}s`;

        setWsLogs((prev) => [
          {
            valveIndex: data.valveIndex,
            state: data.state,
            timestamp: formatted,
          },
          ...prev,
        ]);
      } catch (err) {
        console.error("Eroare la parsarea WS:", err);
      }
    };

    ws.current.onerror = (err) => {
      console.error("❌ Eroare WebSocket:", err);
    };

    return () => {
      ws.current.close();
    };
  }, []);

  return (
    <div>
      <TimerControl
        startTime={startTime}
        stopTime={stopTime}
        onStartTimeChange={setStartTime}
        onStopTimeChange={setStopTime}
        toggleAllValves={toggleAllValves}
        allOn={allOn}
        resetTimer={resetTimer}
      />

      <AreaControl allOn={allOn} toggleAllValves={toggleAllValves} />

      {/* <Senzor toggleAllValves={toggleAllValves} esp32Ip={ESP32_IP} /> */}

      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
        {valves.map((isOn, index) => (
          <ValveControl
            key={index}
            label={`R${index + 1}`}
            isOn={isOn}
            toggle={() => {
              const updatedValves = [...valves];
              updatedValves[index] = !updatedValves[index];
              setValves(updatedValves);
              localStorage.setItem(
                "valvesState",
                JSON.stringify(updatedValves)
              );
              sendWebSocketToggle(index, updatedValves[index]);
            }}
          />
        ))}
      </div>

      <div
        style={{
          marginTop: "20px",
          padding: "10px",
          border: "1px solid #ccc",
          borderRadius: "8px",
          background: "white",
          maxHeight: "300px",
          overflowY: "auto",
        }}
      >
        <h3>📡 Loguri Live (WebSocket)</h3>
        {wsLogs.length === 0 ? (
          <p style={{ color: "#999", fontStyle: "italic" }}>
            Nicio acțiune deocamdată.
          </p>
        ) : (
          <ul style={{ listStyle: "none", paddingLeft: 0 }}>
            {wsLogs.map((log, index) => (
              <li key={index} style={{ marginBottom: "5px" }}>
                <strong>R{log.valveIndex + 1}</strong> —{" "}
                {log.state ? "PORNIT" : "OPRIT"} — la <em>{log.timestamp}</em>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
