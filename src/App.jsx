import { useEffect, useState } from "react";

const call = async (body) =>
  (await fetch("/api", body ? { method: "POST", body: JSON.stringify(body) } : {})).json();
const count = (a) => a.filter(Boolean).length;

export default function App() {
  const [s, setS] = useState(null);
  const [who, setWho] = useState(() => {
    const n = parseInt(location.hash.slice(1), 10);
    return n >= 0 && n < 4 ? n : null;
  });
  useEffect(() => {
    const load = () => call().then(setS).catch(() => {});
    load();
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => { location.hash = who === null ? "" : who; }, [who]);
  if (!s) return <div className="wrap"><h1>Loading…</h1></div>;

  if (who !== null) {
    const d = s.days[who];
    const toggle = (day) => {
      const on = !d[day - 1];
      setS({ ...s, days: s.days.map((a, k) => (k === who ? a.map((v, j) => (j === day - 1 ? on : v)) : a)) });
      call({ i: who, day, on }).then(setS);
    };
    return (
      <div className="wrap">
        <button className="back" onClick={() => setWho(null)}>← Everyone</button>
        <h1>{s.names[who]} <span className="sub">{count(d)}/100</span></h1>
        <div className="grid">
          {d.map((on, j) => (
            <button key={j} className={"day" + (on ? " on" : "")} onClick={() => toggle(j + 1)}>
              {on ? "✓" : j + 1}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="wrap">
      <h1>Progress</h1>
      {s.names.map((n, i) => {
        const c = count(s.days[i]);
        return (
          <div className="card" key={i} onClick={() => setWho(i)}>
            <div className="top">
              <span className="name">{n}</span>
              <span className="num">{c}<small>/100</small></span>
            </div>
            <div className="bar"><i style={{ width: c + "%" }} /></div>
          </div>
        );
      })}
    </div>
  );
}
