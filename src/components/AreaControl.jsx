export default function AreaControl({ allOn, toggleAllValves }) {
  return (
    <div className="area-control">
      <h2>Control General Aria 1</h2>
      <label className="switch">
        <input
          type="checkbox"
          checked={allOn}
          onChange={() => toggleAllValves(!allOn)}
        />
        <span className="slider round"></span>
      </label>
      <span>{allOn ? "Toți robineții PORNIȚI" : "Toți robineții OPRIȚI"}</span>
    </div>
  );
}
