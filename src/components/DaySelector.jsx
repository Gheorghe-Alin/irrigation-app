import React from "react";

const daysOfWeek = [
  "Luni",
  "Marți",
  "Miercuri",
  "Joi",
  "Vineri",
  "Sâmbătă",
  "Duminică",
];

export default function DaySelector({ selectedDays, setSelectedDays }) {
  const toggleDay = (day) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  return (
    <div style={{ marginTop: "10px" }}>
      <strong>Selectează zilele:</strong>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          flexWrap: "wrap",
          gap: "8px",
          marginTop: "5px",
        }}
      >
        {daysOfWeek.map((day) => (
          <button
            key={day}
            onClick={() => toggleDay(day)}
            style={{
              padding: "4px 10px",
              borderRadius: "5px",
              border: "1px solid #ccc",
              backgroundColor: selectedDays.includes(day) ? "#007bff" : "#eee",
              color: selectedDays.includes(day) ? "white" : "black",
              cursor: "pointer",
            }}
          >
            {day}
          </button>
        ))}
      </div>
    </div>
  );
}
