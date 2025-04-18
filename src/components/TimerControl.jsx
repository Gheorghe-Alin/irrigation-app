import { useEffect } from "react";
import "./styles.css";

export default function TimerControl({
  onStartTimeChange,
  onStopTimeChange,
  startTime,
  stopTime,
  toggleAllValves,
  allOn,
  resetTimer, // Primit ca prop din IrrigationSystem
}) {
  // Timer pentru control automat
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

  return (
    <div
      style={{
        padding: "10px",
        border: "1px solid #ccc",
        borderRadius: "8px",
        background: "white",
        textAlign: "center",
      }}
    >
      <h3>Setare Timer</h3>
      <label>
        Pornire la:{" "}
        <input
          type="time"
          value={startTime}
          onChange={(e) => onStartTimeChange(e.target.value)}
        />
      </label>
      <label>
        Oprire la:{" "}
        <input
          type="time"
          value={stopTime}
          onChange={(e) => onStopTimeChange(e.target.value)}
        />
      </label>
      <button
        onClick={resetTimer}
        style={{
          marginTop: "10px",
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
    </div>
  );
}
