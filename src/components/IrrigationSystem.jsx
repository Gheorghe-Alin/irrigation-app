import { useState, useEffect, useCallback } from "react";
import ValveControl from "./ValveControl";
import AreaControl from "./AreaControl";
import TimerControl from "./TimerControl";
// import Senzor from "./Senzor";
import "./styles.css";

const ESP32_CONTROLLERS = [
  { ip: "192.168.1.215", startIndex: 0, endIndex: 15 },    // R1–R16
  { ip: "192.168.1.214", startIndex: 16, endIndex: 31 },   // R17–R32
];

const getControllerForValve = (index) =>
  ESP32_CONTROLLERS.find(c => index >= c.startIndex && index <= c.endIndex);

export default function IrrigationSystem() {
  const [valves, setValves] = useState(() => {
    const saved = localStorage.getItem("valvesState");
    return saved ? JSON.parse(saved) : Array(32).fill(false);
  });

  const [startTime, setStartTime] = useState("");
  const [stopTime, setStopTime] = useState("");
  const allOn = valves.every(valve => valve);

  const sendToggleRequest = async (index, state) => {
    const controller = getControllerForValve(index);
    const localIndex = index - controller.startIndex;

    try {
      await fetch(
        `http://${controller.ip}/toggle?index=${localIndex}&state=${state ? 1 : 0}`
      );
    } catch (error) {
      console.error(`Error sending to ESP (${controller.ip}):`, error);
    }
  };

  const toggleAllValves = useCallback((state) => {
    const updated = Array(32).fill(state);
    setValves(updated);
    localStorage.setItem("valvesState", JSON.stringify(updated));
    for (let i = 0; i < 32; i++) {
      sendToggleRequest(i, state);
    }
  }, []);

  const fetchValveStatus = async () => {
    try {
      const responses = await Promise.all(
        ESP32_CONTROLLERS.map(c =>
          fetch(`http://${c.ip}/valve-status`)
        )
      );
      const data = await Promise.all(responses.map(res => res.json()));
      const combined = data.map(d => d.valves.map(v => v === 1)).flat();
      setValves(combined);
      localStorage.setItem("valvesState", JSON.stringify(combined));
    } catch (error) {
      console.error("Error fetching status:", error);
    }
  };

  const resetTimer = () => {
    setStartTime("");
    setStopTime("");
    console.log("⏳ Timer reset!");
  };

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const currentTime = now.toTimeString().slice(0, 5);
      if (currentTime === startTime && !allOn) {
        console.log("Auto ON");
        toggleAllValves(true);
      }
      if (currentTime === stopTime && allOn) {
        console.log("Auto OFF");
        toggleAllValves(false);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [startTime, stopTime, allOn, toggleAllValves]);

  useEffect(() => {
    const interval = setInterval(fetchValveStatus, 9000);
    return () => clearInterval(interval);
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
      {/* <Senzor toggleAllValves={toggleAllValves} esp32Ip={ESP32_CONTROLLERS[0].ip} /> */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
        {valves.map((isOn, index) => (
          <ValveControl
            key={index}
            label={`R${index + 1}`}
            isOn={isOn}
            toggle={() => {
              const updated = [...valves];
              updated[index] = !updated[index];
              setValves(updated);
              localStorage.setItem("valvesState", JSON.stringify(updated));
              sendToggleRequest(index, updated[index]);
            }}
          />
        ))}
      </div>
    </div>
  );
}
