import { useEffect, useState } from "react";

export default function ValveLogWindow({ esp32Ip }) {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const response = await fetch(`http://${esp32Ip}/logs`);
        const data = await response.json();
        const filtered = data.filter((log) => log.timestamp > 0); // elimină logurile goale
        setLogs(filtered.reverse()); // cele mai recente primele
      } catch (error) {
        console.error("Eroare la preluarea logurilor:", error);
      }
    };

    fetchLogs();
    const interval = setInterval(fetchLogs, 10000);
    return () => clearInterval(interval);
  }, [esp32Ip]);

  const clearLogs = async () => {
    setLogs([]);
    try {
      await fetch(`http://${esp32Ip}/clear-logs`);
    } catch (error) {
      console.warn("Clear doar în frontend – ESP32 nu a răspuns.");
    }
  };

  const formatTime = (ms) => {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
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
      <h3>📜 Istoric Robineți</h3>
      <button
        onClick={clearLogs}
        style={{
          marginBottom: "10px",
          padding: "6px 12px",
          background: "orange",
          color: "white",
          border: "none",
          borderRadius: "5px",
          cursor: "pointer",
        }}
      >
        🗑️ Șterge Loguri
      </button>
      {logs.length === 0 ? (
        <p style={{ color: "#999", fontStyle: "italic" }}>
          Niciun log disponibil.
        </p>
      ) : (
        <ul style={{ listStyle: "none", paddingLeft: 0 }}>
          {logs.map((log, index) => (
            <li key={index} style={{ marginBottom: "5px" }}>
              <strong>R{log.valveIndex + 1}</strong> —{" "}
              {log.state ? "PORNIT" : "OPRIT"} — la{" "}
              <em>{formatTime(log.timestamp)}</em>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
