import { useEffect, useState } from "react";

const call = async (body) =>
  (await fetch("/api", body ? { method: "POST", body: JSON.stringify(body) } : {})).json();

export default function App() {
  const [s, setS] = useState(null);
  useEffect(() => {
    const load = () => call().then(setS).catch(() => {});
    load();
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, []);
  if (!s) return <p style={{ padding: 20 }}>Loading…</p>;
  const btn = { fontSize: 22, width: 48, height: 48, borderRadius: 8, border: "1px solid #888" };
  return (
    <div style={{ fontFamily: "system-ui", maxWidth: 480, margin: "20px auto", padding: "0 12px" }}>
      {s.names.map((n, i) => (
        <div key={i} style={{ margin: "14px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <b style={{ flex: 1 }}>{n}</b>
            <button style={btn} onClick={() => call({ i, d: -1 }).then(setS)}>-</button>
            <span style={{ fontSize: 24, width: 60, textAlign: "center" }}>{s.v[i]}</span>
            <button style={btn} onClick={() => call({ i, d: 1 }).then(setS)}>+</button>
          </div>
          <progress max={100} value={s.v[i]} style={{ width: "100%" }} />
        </div>
      ))}
    </div>
  );
}
