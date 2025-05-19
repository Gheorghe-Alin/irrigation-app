import { useState, useEffect, useCallback } from "react";
import ValveControl from "./ValveControl";
import AreaControl from "./AreaControl";
import TimerControl from "./TimerControl";
import "./styles.css";

const ESP32_CONTROLLERS = [
  { ip: "192.168.1.101", startIndex: 0, endIndex: 15 },
  { ip: "192.168.1.150", startIndex: 16, endIndex: 31 },
];

const getControllerForValve = (index) =>
  ESP32_CONTROLLERS.find((c) => index >= c.startIndex && index <= c.endIndex);

export default function IrrigationSystem() {
  const [valves, setValves] = useState(() => {
    const saved = localStorage.getItem("valvesState");
    return saved ? JSON.parse(saved) : Array(32).fill(false);
  });

  const [startTimesEsp1, setStartTimesEsp1] = useState(() => {
    const saved = localStorage.getItem("startTimesEsp1");
    return saved ? JSON.parse(saved) : [];
  });

  const [startTimesEsp2, setStartTimesEsp2] = useState(() => {
    const saved = localStorage.getItem("startTimesEsp2");
    return saved ? JSON.parse(saved) : [];
  });

  const [stopTimeEsp1, setStopTimeEsp1] = useState("");
  const [stopTimeEsp2, setStopTimeEsp2] = useState("");
  const [programStatus, setProgramStatus] = useState("idle");
  const [timeoutId, setTimeoutId] = useState(null);
  const allOn = valves.every((valve) => valve);

  const sendToggleRequest = async (index, state) => {
    const controller = getControllerForValve(index);
    const localIndex = index - controller.startIndex;

    try {
      await fetch(
        `http://${controller.ip}/toggle?index=${localIndex}&state=${
          state ? 1 : 0
        }`
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

  const runSequentialProgram = async (secondsPerValve, controller) => {
    try {
      const durationMs = secondsPerValve * 1000;
      const { ip, startIndex, endIndex } = controller;

      setProgramStatus(`running-${startIndex}-${endIndex}`);
      await fetch(`http://${ip}/program?duration=${secondsPerValve}`);
      console.log(`🚀 Controller ${ip} started`);

      const timeout = setTimeout(() => {
        setProgramStatus("done");
        setTimeoutId(null);
      }, (endIndex - startIndex + 1) * durationMs + 2000);

      setTimeoutId(timeout);
    } catch (error) {
      console.error("❌ Eroare la program:", error);
      setProgramStatus("idle");
    }
  };

  const runScheduledProgramEsp1 = (duration) => {
    runSequentialProgram(duration, ESP32_CONTROLLERS[0]);
  };

  const runScheduledProgramEsp2 = (duration) => {
    runSequentialProgram(duration, ESP32_CONTROLLERS[1]);
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

  const fetchValveStatus = async () => {
    try {
      const responses = await Promise.all(
        ESP32_CONTROLLERS.map((c) => fetch(`http://${c.ip}/valve-status`))
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

  // useEffect(() => {
  //   localStorage.setItem("startTimesEsp1", JSON.stringify(startTimesEsp1));
  // }, [startTimesEsp1]);

  // useEffect(() => {
  //   localStorage.setItem("startTimesEsp2", JSON.stringify(startTimesEsp2));
  // }, [startTimesEsp2]);

  return (
    <div>
      <TimerControl
        title="Setare Timer Manuală ESP1"
        startTimes={startTimesEsp1}
        setStartTimes={setStartTimesEsp1}
        stopTime={stopTimeEsp1}
        onStopTimeChange={setStopTimeEsp1}
        allOn={valves.slice(0, 16).every((v) => v)}
        resetTimer={() => {
          setStartTimesEsp1([]);
          localStorage.removeItem("startTimesEsp1");
        }}
        runScheduledProgram={runScheduledProgramEsp1}
      />

      <TimerControl
        title="Setare Timer Manuală ESP2"
        startTimes={startTimesEsp2}
        setStartTimes={setStartTimesEsp2}
        stopTime={stopTimeEsp2}
        onStopTimeChange={setStopTimeEsp2}
        allOn={valves.slice(16, 32).every((v) => v)}
        resetTimer={() => {
          setStartTimesEsp2([]);
          localStorage.removeItem("startTimesEsp2");
        }}
        runScheduledProgram={runScheduledProgramEsp2}
      />

      <AreaControl allOn={allOn} toggleAllValves={toggleAllValves} />

      <div
        style={{
          margin: "10px auto",
          padding: "10px",
          border: "1px solid #007bff",
          borderRadius: "8px",
          maxWidth: "400px",
          textAlign: "center",
          backgroundColor: "#f0f8ff",
          color: "#007bff",
          fontWeight: "bold",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
          }}
        >
          {programStatus.includes("running") && (
            <>
              <span>🚀</span>
              <span>Rulează program...</span>
            </>
          )}
          {programStatus === "done" && (
            <>
              <span>✅</span>
              <span>Program finalizat!</span>
            </>
          )}
          {programStatus === "idle" && (
            <>
              <span>🔴</span>
              <span>Niciun program activ.</span>
            </>
          )}
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
