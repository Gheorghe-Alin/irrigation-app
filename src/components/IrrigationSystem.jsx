import { useState, useEffect, useCallback } from "react";
import AreaControl from "./AreaControl";
import ValveControl from "./ValveControl";
import TimerControl from "./TimerControl";
import Senzor from "./Senzor";
import "./styles.css";

const ESP32_IP = "192.168.1.215";

export default function IrrigationSystem() {
  const [valves, setValves] = useState(() => {
    const savedValves = localStorage.getItem("valvesState");
    // Modificat de la 8 la 16 valve
    return savedValves ? JSON.parse(savedValves) : Array(16).fill(false);
  });

  const [startTime, setStartTime] = useState("");
  const [stopTime, setStopTime] = useState("");
  const allOn = valves.every((valve) => valve);

  const sendToggleRequest = async (index, state) => {
    try {
      await fetch(
        `http://${ESP32_IP}/toggle?index=${index}&state=${state ? 1 : 0}`
      );
    } catch (error) {
      console.error("Eroare la trimiterea comenzii către ESP32:", error);
    }
  };

  const toggleAllValves = useCallback((state) => {
    const updatedValves = Array(16).fill(state); // Actualizat la 16 valve
    setValves(updatedValves);
    localStorage.setItem("valvesState", JSON.stringify(updatedValves));
    for (let i = 0; i < 16; i++) {
      // Buclă pentru 16 valve
      sendToggleRequest(i, state);
    }
  }, []);

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

      <Senzor toggleAllValves={toggleAllValves} esp32Ip={ESP32_IP} />

      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
        {valves.map((isOn, index) => (
          <ValveControl
            key={index}
            label={`R${index + 1}`} // Corectat pentru 16 valve
            isOn={isOn}
            toggle={() => {
              const updatedValves = [...valves];
              updatedValves[index] = !updatedValves[index];
              setValves(updatedValves);
              localStorage.setItem(
                "valvesState",
                JSON.stringify(updatedValves)
              );
              sendToggleRequest(index, updatedValves[index]);
            }}
          />
        ))}
      </div>
    </div>
  );
}
