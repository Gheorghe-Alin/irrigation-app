import { useEffect, useState, useRef } from "react";
import "./styles.css";

export default function TimerControl({
  startTimes,
  setStartTimes,
  stopTime,
  onStopTimeChange,
  allOn,
  resetTimer,
  runScheduledProgram,
}) {
  const [duration, setDuration] = useState("");
  const [programScheduled, setProgramScheduled] = useState(false);
  const timeoutsRef = useRef([]); // referință la toate timeout-urile active

  useEffect(() => {
    const saved = localStorage.getItem("valveDuration");
    if (saved) {
      setDuration(saved);
    }
  }, []);

  useEffect(() => {
    if (duration) {
      localStorage.setItem("valveDuration", duration);
    }
  }, [duration]);

  const addStartTime = (newTime) => {
    if (newTime && !startTimes.includes(newTime)) {
      const updated = [...startTimes, newTime].sort();
      setStartTimes(updated);
    }
  };

  const removeStartTime = (timeToRemove) => {
    const updated = startTimes.filter((t) => t !== timeToRemove);
    setStartTimes(updated);
  };

  const scheduleProgramAtTime = () => {
    if (startTimes.length === 0 || !duration) {
      alert("Adaugă cel puțin o oră de pornire și durata.");
      return;
    }

    // Golește timeout-urile anterioare
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];

    for (const time of startTimes) {
      const [startHour, startMinute] = time.split(":").map(Number);
      const now = new Date();
      const start = new Date();

      start.setHours(startHour, startMinute, 0, 0);
      if (start < now) continue;

      const delay = start.getTime() - now.getTime();

      const timeoutId = setTimeout(() => {
        runScheduledProgram(Number(duration));
      }, delay);

      timeoutsRef.current.push(timeoutId);
    }

    setProgramScheduled(true);
    alert(`✅ Programările au fost setate: ${startTimes.join(", ")}`);
  };

  const cancelAllSchedules = () => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
    setProgramScheduled(false);
    alert("❌ Toate programările au fost anulate.");
  };

  return (
    <div
      style={{
        padding: "10px",
        border: "1px solid #ccc",
        borderRadius: "8px",
        background: "white",
        textAlign: "center",
        marginBottom: "20px",
      }}
    >
      <h3>Setare Timer Manuală</h3>

      <div style={{ marginBottom: "10px" }}>
        <label>
          Adaugă oră de pornire:{" "}
          <input
            type="time"
            onChange={(e) => addStartTime(e.target.value)}
          />
        </label>

        <ul style={{ listStyle: "none", padding: 0 }}>
          {startTimes.map((time, index) => (
            <li key={index}>
              ⏰ {time}{" "}
              <button
                onClick={() => removeStartTime(time)}
                style={{
                  marginLeft: "10px",
                  background: "tomato",
                  color: "white",
                  border: "none",
                  padding: "2px 6px",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Șterge
              </button>
            </li>
          ))}
        </ul>

        <label>
          Ora de oprire (opțională):{" "}
          <input
            type="time"
            value={stopTime}
            onChange={(e) => onStopTimeChange(e.target.value)}
          />
        </label>
        <br />

        <label>
          Durată per robinet (secunde):{" "}
          <input
            type="number"
            min="1"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="Ex: 7"
          />
        </label>
      </div>

      <div>
        <button
          onClick={resetTimer}
          style={{
            marginRight: "10px",
            padding: "8px 16px",
            background: "red",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
          }}
        >
          Resetează Timerul
        </button>

        <button
          onClick={scheduleProgramAtTime}
          style={{
            padding: "8px 16px",
            background: "#007bff",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          ▶️ Setează și Programează
        </button>
      </div>

      <button
        onClick={cancelAllSchedules}
        style={{
          marginTop: "10px",
          padding: "8px 16px",
          background: "gray",
          color: "white",
          border: "none",
          borderRadius: "5px",
          cursor: "pointer",
        }}
      >
        ❌ Anulează toate programările
      </button>

      {programScheduled && (
        <p style={{ marginTop: "10px", color: "green", fontWeight: "bold" }}>
          ✅ Programări active la: {startTimes.join(", ")}
        </p>
      )}
    </div>
  );
}
