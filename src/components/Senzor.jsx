import { useEffect, useState } from "react";
import "./styles.css";

export default function Senzor({ toggleAllValves, esp32Ip }) {
  const [isRaining, setIsRaining] = useState(false);

  useEffect(() => {
    const checkRainSensor = async () => {
      try {
        const response = await fetch(`http://${esp32Ip}/rain-sensor`);
        const data = await response.json();
        setIsRaining(data.isRaining);

        console.log("Stare senzor de ploaie:", data.isRaining ? "ON" : "OFF");

        if (data.isRaining) {
          console.log("⚠️ Ploaie detectată! Oprire robineți.");
          toggleAllValves(false);
        }
      } catch (error) {
        console.error("Eroare la citirea senzorului de ploaie:", error);
      }
    };

    const interval = setInterval(checkRainSensor, 20000); // Interoghează la fiecare 2 secunde
    return () => clearInterval(interval);
  }, [toggleAllValves, esp32Ip]);

  return (
    <div
      style={{
        padding: "10px",
        border: "1px solid #ccc",
        borderRadius: "8px",
        width: "200px",
        textAlign: "center",
        background: "white",
      }}
    >
      <h3>Senzor de Ploaie</h3>
      <p
        style={{
          fontSize: "18px",
          fontWeight: "bold",
          color: isRaining ? "red" : "green",
        }}
      >
        {isRaining ? "ON - Ploaie detectată" : "OFF - Fără ploaie"}
      </p>
    </div>
  );
}
