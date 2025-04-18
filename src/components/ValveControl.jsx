export default function ValveControl({ label, isOn, toggle }) {
  return (
    <div className="valve-control">
      <h4>{label}</h4>
      <label className="switch">
        <input type="checkbox" checked={isOn} onChange={toggle} />
        <span className="slider round"></span>
      </label>
      <span>{isOn ? "ON" : "OFF"}</span>
    </div>
  );
}
