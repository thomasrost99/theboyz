import { useEffect, useState } from "react";

const call = async (body) =>
  (await fetch("/api", body ? { method: "POST", body: JSON.stringify(body) } : {})).json();
function Board({ names }) {
  const [msgs, setMsgs] = useState([]);
  const [name, setName] = useState(() => localStorage.getItem("who") || names[0]);
  const [text, setText] = useState("");
  useEffect(() => {
    const load = () => fetch("/messages").then((r) => r.json()).then(setMsgs).catch(() => {});
    load();
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, []);
  const post = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    localStorage.setItem("who", name);
    const r = await fetch("/messages", { method: "POST", body: JSON.stringify({ name, text }) });
    setMsgs(await r.json());
    setText("");
  };
  return (
    <div className="board">
      <h2>Message board</h2>
      <form onSubmit={post}>
        <select value={name} onChange={(e) => setName(e.target.value)}>
          {names.map((n) => <option key={n}>{n}</option>)}
        </select>
        <input value={text} maxLength={500} placeholder="Say something…" onChange={(e) => setText(e.target.value)} />
        <button className="plus send">Post</button>
      </form>
      {msgs.map((m) => (
        <div className="msg" key={m.ts}>
          <b>{m.name}</b> <span>{new Date(m.ts).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>
          <p>{m.text}</p>
        </div>
      ))}
    </div>
  );
}

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
      <Board names={s.names} />
    </div>
  );
}
