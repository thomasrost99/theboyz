import { useEffect, useState } from "react";
import { burst } from "./confetti.js";

const MILES = [
  [10, "Warm-up", "🔥"], [25, "Quarter", "⚡"], [50, "Halfway", "🚀"], [75, "Beast mode", "🦍"], [100, "Legend", "👑"],
];
const sum = (a) => a.reduce((t, on, j) => t + (on ? j + 1 : 0), 0); // reps of ONE exercise
const title = (c) => [...MILES].reverse().find((m) => c >= m[0]);
const count = (a) => a.filter(Boolean).length;
const fmt = (n) => n.toLocaleString();
const call = async (body) =>
  (await fetch("/api", body ? { method: "POST", body: JSON.stringify(body) } : {})).json();
const getMe = () => { try { const n = parseInt(localStorage.getItem("me"), 10); return n >= 0 && n < 4 ? n : null; } catch { return null; } };

function Ring({ pct, size = 64 }) {
  const r = (size - 10) / 2, C = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} className="ring">
      <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#7c5cff" /><stop offset="1" stopColor="#22d3ee" /></linearGradient></defs>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#ffffff18" strokeWidth="8" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="url(#g)" strokeWidth="8" strokeLinecap="round"
        strokeDasharray={C} strokeDashoffset={C * (1 - pct / 100)} transform={`rotate(-90 ${size / 2} ${size / 2})`} className="ringfg" />
    </svg>
  );
}

function Board({ names, me }) {
  const [msgs, setMsgs] = useState([]);
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
    const r = await fetch("/messages", { method: "POST", body: JSON.stringify({ name: names[me], text }) });
    setMsgs(await r.json());
    setText("");
  };
  return (
    <div className="board">
      <h2>Message board</h2>
      <form onSubmit={post}>
        <input value={text} maxLength={500} placeholder={`Say something, ${names[me]}…`} onChange={(e) => setText(e.target.value)} />
        <button className="send">Post</button>
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

export default function App() {
  const [s, setS] = useState(null);
  const [toast, setToast] = useState(null);
  const [me, setMe] = useState(getMe);
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
  useEffect(() => { location.hash = who === null ? "" : who; window.scrollTo(0, 0); }, [who]);
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(null), 3200); return () => clearTimeout(t); } }, [toast]);

  const pick = (i) => { try { if (i === null) localStorage.removeItem("me"); else localStorage.setItem("me", i); } catch {} setMe(i); if (i !== null) setWho(null); };
  const shell = (kids) => (
    <>
      <div className="blobs"><i /><i /><i /></div>
      <div className="wrap">{kids}</div>
      {toast && <div className="toast" key={toast}>{toast}</div>}
    </>
  );
  if (!s) return shell(<h1 className="hero">Loading…</h1>);

  if (me === null) {
    return shell(
      <div className="hero">
        <div className="kicker">THE BOYZ</div>
        <h1>WHO ARE<br />YOU?</h1>
        <p>Pick your name. You can switch any time.</p>
        <div className="picker">
          {s.names.map((n, i) => <button key={i} style={{ animationDelay: i * 70 + "ms" }} onClick={() => pick(i)}>{n}</button>)}
        </div>
      </div>
    );
  }

  if (who !== null) {
    const d = s.days[who], c = count(d);
    const next = d.indexOf(false) + 1; // 0 when all done
    const mine = who === me;
    const toggle = (day, ev) => {
      if (!mine) return;
      const on = !d[day - 1];
      const nc = c + (on ? 1 : -1);
      if (on) {
        const b = ev.currentTarget.getBoundingClientRect();
        const hit = MILES.find((m) => m[0] === nc);
        burst(b.left + b.width / 2, b.top + b.height / 2, !!hit);
        if (hit) setToast(`${hit[2]} ${hit[1]}! ${nc} days done`);
        navigator.vibrate?.(hit ? [30, 40, 60] : 15);
      }
      setS({ ...s, days: s.days.map((a, k) => (k === who ? a.map((v, j) => (j === day - 1 ? on : v)) : a)) });
      call({ i: who, day, on }).then(setS);
    };
    const t = title(c), r = sum(d);
    return shell(<>
      <button className="back" onClick={() => setWho(null)}>← Everyone</button>
      <div className="phead">
        <Ring pct={c} size={96} />
        <div>
          <h1>{s.names[who]}{who === me && <span className="you">YOU</span>}</h1>
          <div className="sub">{c}/100 days {t && <span className="badge">{t[2]} {t[1]}</span>}</div>
        </div>
      </div>
      <div className="reps">
        <div><b>{fmt(r)}</b><span>push-ups</span></div>
        <div><b>{fmt(r)}</b><span>sit-ups</span></div>
        <div><b>{fmt(r)}</b><span>pull-ups</span></div>
      </div>
      {next > 0
        ? <div className="next"><small>Up next</small><b>Day {next}</b><span>{next} push-ups · {next} sit-ups · {next} pull-ups</span></div>
        : <div className="next win"><b>👑 100 DAYS. LEGEND.</b></div>}
      <div className="grid">
        {d.map((on, j) => (
          <button key={j} className={"day" + (mine ? "" : " ro") + (on ? " on" : "") + ((j + 1) % 10 === 0 ? " ten" : "") + (j + 1 === next ? " nxt" : "")}
            title={`Day ${j + 1}: ${j + 1} of each`} disabled={!mine} onClick={(e) => toggle(j + 1, e)}>
            {on ? "✓" : j + 1}
          </button>
        ))}
      </div>
      <p className="hint">{mine ? "Tap a day when you've done all three. Day N = N push-ups, N sit-ups, N pull-ups." : `View only. You can only check off your own days (you're ${s.names[me]}).`}</p>
    </>);
  }

  const total = s.days.reduce((t, d) => t + 3 * sum(d), 0);
  const order = s.names.map((_, i) => i).sort((a, b) => count(s.days[b]) - count(s.days[a]));
  return shell(<>
    <div className="hero">
      <div className="kicker">THE BOYZ</div>
      <h1>100 DAY<br />CHALLENGE</h1>
      <p>Day N = <b>N push-ups</b>, <b>N sit-ups</b>, <b>N pull-ups</b>. No days off. 💪</p>
      <div className="total"><b>{fmt(total)}</b> reps crushed together</div>
      <div className="meline">You're <b>{s.names[me]}</b> · <a onClick={() => pick(null)}>switch</a></div>
    </div>
    {order.map((i, rank) => {
      const c = count(s.days[i]), t = title(c);
      return (
        <div className={"card" + (i === me ? " mine" : "")} key={i} style={{ animationDelay: rank * 70 + "ms" }} onClick={() => setWho(i)}>
          <div className="top">
            <Ring pct={c} />
            <div className="who">
              <span className="name">{c > 0 ? ["👑 ", "🥈 ", "🥉 "][s.days.filter((d) => count(d) > c).length] || "" : ""}{s.names[i]}{i === me && <span className="you">YOU</span>}</span>
              <span className="mini">{t ? `${t[2]} ${t[1]} · ` : ""}{fmt(3 * sum(s.days[i]))} reps</span>
            </div>
            <span className="num">{c}<small>/100</small></span>
          </div>
        </div>
      );
    })}
    <Board names={s.names} me={me} />
  </>);
}
