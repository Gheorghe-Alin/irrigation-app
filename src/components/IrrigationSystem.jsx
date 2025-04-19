import { useState, useEffect, useCallback } from "react";
import ValveControl from "./ValveControl";
import AreaControl from "./AreaControl";
import TimerControl from "./TimerControl";
import "./styles.css";

const ESP32_CONTROLLERS = [
  { ip: "86.120.249.116:8081", startIndex: 0, endIndex: 15 },
  { ip: "86.120.249.116:8082", startIndex: 16, endIndex: 31 }, //da
];
const getControllerForValve = (index) =>
  ESP32_CONTROLLERS.find((c) => index >= c.startIndex && index <= c.endIndex);

export default function IrrigationSystem() {
  const [valves, setValves] = useState(() => {
    const saved = localStorage.getItem("valvesState");
    return saved ? JSON.parse(saved) : Array(32).fill(false);
  });

  const [startTimes, setStartTimes] = useState([]);
  const [stopTime, setStopTime] = useState("");
  const [programStatus, setProgramStatus] = useState("idle");
  const [timeoutId, setTimeoutId] = useState(null);
  const allOn = valves.every((valve) => valve);

  const sendToggleRequest = async (index, state) => {
    const controller = getControllerForValve(index);
    const localIndex = index - controller.startIndex;

    try {
      await fetch(
        `http://${controller.ip}/toggle?index=${localIndex}&state=${state ? 1 : 0}`
      );
    } catch (error) {
      console.error(`Eroare la ESP (${controller.ip}):`, error);
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

  const runSequentialProgram = async (secondsPerValve = 5) => {
    try {
      const durationMs = secondsPerValve * 1000;
      const masterIP = ESP32_CONTROLLERS[0].ip;
      const slaveIP = ESP32_CONTROLLERS[1].ip;

      const masterValveCount =
        ESP32_CONTROLLERS[0].endIndex - ESP32_CONTROLLERS[0].startIndex + 1;
      const slaveValveCount =
        ESP32_CONTROLLERS[1].endIndex - ESP32_CONTROLLERS[1].startIndex + 1;

      const totalMasterDuration = durationMs * masterValveCount;
      const totalSlaveDuration = durationMs * slaveValveCount;

      setProgramStatus("running-master");
      await fetch(`http://${masterIP}/program?duration=${secondsPerValve}`);
      console.log("🚀 Master started");

      const masterTimeout = setTimeout(async () => {
        setProgramStatus("running-slave");
        await fetch(`http://${slaveIP}/program?duration=${secondsPerValve}`);
        console.log("🚀 Slave started");

        const slaveTimeout = setTimeout(() => {
          setProgramStatus("done");
          setTimeoutId(null);
        }, totalSlaveDuration + 2000);

        setTimeoutId(slaveTimeout);
      }, totalMasterDuration + 2000);

      setTimeoutId(masterTimeout);
    } catch (error) {
      console.error("❌ Eroare la programul secvențial:", error);
      setProgramStatus("idle");
    }
  };

  const runScheduledProgram = (duration) => {
    setProgramStatus("idle");
    runSequentialProgram(duration);
  };

  const stopProgram = async () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      setTimeoutId(null);
    }

    setProgramStatus("idle");

    for (const controller of ESP32_CONTROLLERS) {
      try {
        await fetch(`http://${controller.ip}/stop`);
      } catch (error) {
        console.warn(`Nu am putut opri ESP-ul la ${controller.ip}`);
      }
    }

    toggleAllValves(false);
    alert("⛔ Programul a fost oprit manual.");
  };

  const resetTimer = () => {
    setStartTimes([]);
    setStopTime("");
    setProgramStatus("idle");
    if (timeoutId) clearTimeout(timeoutId);
  };

  const fetchValveStatus = async () => {
    try {
      const responses = await Promise.all(
        ESP32_CONTROLLERS.map((c) =>
          fetch(`http://${c.ip}/valve-status`)
        )
      );
      const data = await Promise.all(responses.map((res) => res.json()));
      const combined = data.map((d) => d.valves.map((v) => v === 1)).flat();
      setValves(combined);
      localStorage.setItem("valvesState", JSON.stringify(combined));
    } catch (error) {
      console.error("Eroare la citirea statusului:", error);
    }
  };

  useEffect(() => {
    const interval = setInterval(fetchValveStatus, 9000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <TimerControl
        startTimes={startTimes}
        setStartTimes={setStartTimes}
        stopTime={stopTime}
        onStopTimeChange={setStopTime}
        allOn={allOn}
        resetTimer={resetTimer}
        runScheduledProgram={runScheduledProgram}
      />

      <AreaControl allOn={allOn} toggleAllValves={toggleAllValves} />

      <div style={{
        margin: "10px auto",
        padding: "10px",
        border: "1px solid #007bff",
        borderRadius: "8px",
        maxWidth: "400px",
        textAlign: "center",
        backgroundColor: "#f0f8ff",
        color: "#007bff",
        fontWeight: "bold",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}>
          {programStatus === "running-master" && (<><span>🔵</span><span>Rulează Master...</span></>)}
          {programStatus === "running-slave" && (<><span>🟣</span><span>Rulează Slave...</span></>)}
          {programStatus === "done" && (<><span>✅</span><span>Program finalizat complet!</span></>)}
          {programStatus === "idle" && (<><span>🔴</span><span>Niciun program activ.</span></>)}
        </div>

        <button
          onClick={stopProgram}
          disabled={programStatus === "idle"}
          style={{
            marginTop: "10px",
            padding: "6px 12px",
            backgroundColor: programStatus === "idle" ? "#ccc" : "#dc3545",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: programStatus === "idle" ? "not-allowed" : "pointer",
          }}
        >
          ⛔ Oprește Programul
        </button>
      </div>

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
