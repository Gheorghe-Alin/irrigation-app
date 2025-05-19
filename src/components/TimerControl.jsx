import { useEffect, useState, useRef } from "react";
import DaySelector from "./DaySelector";
import "./styles.css";

export default function TimerControl({
  title,
  startTimes,
  setStartTimes,
  allOn,
  resetTimer,
  runScheduledProgram,
}) {
  const [duration, setDuration] = useState("");
  const [programScheduled, setProgramScheduled] = useState(false);
  const timeoutsRef = useRef([]);
  const timeInputRef = useRef(null);
  const [selectedDays, setSelectedDays] = useState([]);

  // Încarcă durata din localStorage
  useEffect(() => {
    const saved = localStorage.getItem("valveDuration");
    if (saved) {
      setDuration(saved);
    }
  }, []);

  // Salvează durata când se schimbă
  useEffect(() => {
    if (duration) {
      localStorage.setItem("valveDuration", duration);
    }
  }, [duration]);

  // Reprogramează automat la pornire dacă avem programări și durată
  useEffect(() => {
    const storageKey = title.includes("ESP1")
      ? "startTimesEsp1"
      : "startTimesEsp2";

    const saved = localStorage.getItem(storageKey);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.length > 0) {
        setStartTimes(parsed);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (startTimes.length > 0 && duration) {
      scheduleProgramAtTime();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration]);

  const addStartTime = (newTime) => {
    if (!newTime || selectedDays.length === 0) {
      alert("Selectează o oră și cel puțin o zi.");
      return;
    }

    const newEntry = { time: newTime, days: [...selectedDays] };
    const alreadyExists = startTimes.some(
      (entry) =>
        entry.time === newEntry.time &&
        entry.days.sort().join(",") === newEntry.days.sort().join(",")
    );

    if (!alreadyExists) {
      const updated = [...startTimes, newEntry];
      setStartTimes(updated);
    }

    setSelectedDays([]);
    if (timeInputRef.current) timeInputRef.current.value = "";
  };

  const removeStartTime = (index) => {
    const updated = [...startTimes];
    updated.splice(index, 1);
    setStartTimes(updated);
  };

  const getDelayUntilNext = (targetDay, targetTime) => {
    const dayIndexMap = {
      Duminică: 0,
      Luni: 1,
      Marți: 2,
      Miercuri: 3,
      Joi: 4,
      Vineri: 5,
      Sâmbătă: 6,
    };

    const [hour, minute] = targetTime.split(":").map(Number);
    const now = new Date();
    const target = new Date(now);
    const targetDayIndex = dayIndexMap[targetDay];
    const currentDay = now.getDay();

    let dayDiff = (targetDayIndex - currentDay + 7) % 7;
    if (
      dayDiff === 0 &&
      (hour < now.getHours() ||
        (hour === now.getHours() && minute <= now.getMinutes()))
    ) {
      dayDiff = 7;
    }

    target.setDate(now.getDate() + dayDiff);
    target.setHours(hour, minute, 0, 0);

    return target - now;
  };

  const scheduleProgramAtTime = () => {
    if (startTimes.length === 0 || !duration) {
      alert("Adaugă cel puțin o oră + zi și durata.");
      return;
    }

    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];

    for (const entry of startTimes) {
      for (const day of entry.days) {
        const delay = getDelayUntilNext(day, entry.time);

        const timeoutId = setTimeout(() => {
          runScheduledProgram(Number(duration));
        }, delay);

        timeoutsRef.current.push(timeoutId);
      }
    }

    const storageKey = title.includes("ESP1")
      ? "startTimesEsp1"
      : "startTimesEsp2";
    localStorage.setItem(storageKey, JSON.stringify(startTimes));

    setProgramScheduled(true);
    alert("✅ Programările au fost setate.");
  };

  const cancelAllSchedules = () => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
    setProgramScheduled(false);

    setStartTimes([]);
    localStorage.removeItem(
      title.includes("ESP1") ? "startTimesEsp1" : "startTimesEsp2"
    );

    if (timeInputRef.current) timeInputRef.current.value = "";
    setSelectedDays([]);

    alert("❌ Toate programările au fost anulate și resetate.");
  };

  const handleReset = () => {
    // NU afectează programările salvate
    if (timeInputRef.current) timeInputRef.current.value = "";
    setSelectedDays([]);
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
      <h3>{title}</h3>

      <div style={{ marginBottom: "10px" }}>
        <label>
          Adaugă oră de pornire:{" "}
          <input
            type="time"
            ref={timeInputRef}
            id="time-input"
            onChange={(e) => addStartTime(e.target.value)}
          />
        </label>

        <DaySelector
          selectedDays={selectedDays}
          setSelectedDays={setSelectedDays}
        />

        <ul style={{ listStyle: "none", padding: 0, marginTop: "10px" }}>
          {startTimes.map((entry, index) => (
            <li key={index}>
              ⏰ {entry.time} — 📅 {entry.days.join(", ")} — ⏳ {duration}s{" "}
              <button
                onClick={() => removeStartTime(index)}
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
          onClick={handleReset}
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
          ✅ Programări active
        </p>
      )}
    </div>
  );
}
