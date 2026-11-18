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
  if (!s) return <div className="wrap"><h1>Loading…</h1></div>;
  return (
    <div className="wrap">
      <h1>Progress</h1>
      {s.names.map((n, i) => (
        <div className="card" key={i}>
          <div className="top">
            <span className="name">{n}</span>
            <button onClick={() => call({ i, d: -1 }).then(setS)}>-</button>
            <span className="num">{s.v[i]}<small>/100</small></span>
            <button className="plus" onClick={() => call({ i, d: 1 }).then(setS)}>+</button>
          </div>
          <div className="bar"><i style={{ width: s.v[i] + "%" }} /></div>
        </div>
      ))}
    </div>
  );
}
