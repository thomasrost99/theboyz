import { useEffect, useRef, useState } from "react";
import { burst } from "./confetti.js";
import Sheet from "./Sheet.jsx";
import Stats from "./Stats.jsx";
import Graph from "./Graph.jsx";
import Today from "./Today.jsx";
import Beer from "./Beer.jsx";
import PhotoPrompt, { seen, markSeen } from "./PhotoPrompt.jsx";
import { useScrollLock } from "./lock.js";
import { holdPhoto, getHeld, dropHeld, heldDays } from "./held.js";

const MILES = [
  [10, "Warm-up", "🔥"], [25, "Quarter", "⚡"], [50, "Halfway", "🚀"], [75, "Beast mode", "🦍"], [100, "Legend", "👑"],
];
const COLORS = ["#7c5cff", "#22d3ee", "#ffd34d", "#ff5c8a"]; // one colour per person (same as Stats)
const sum = (a) => a.reduce((t, on, j) => t + (on ? j + 1 : 0), 0); // reps of ONE exercise
const title = (c) => [...MILES].reverse().find((m) => c >= m[0]);
const count = (a) => a.filter(Boolean).length;
const fmt = (n) => n.toLocaleString();
const tok = () => { try { return localStorage.getItem("tok") || ""; } catch { return ""; } };
const authed = (body) => ({ method: "POST", headers: { authorization: "Bearer " + tok() }, body: JSON.stringify(body) });
const lost = () => window.dispatchEvent(new Event("boyz-auth"));
// GET, or POST as the signed-in person. Returns null (and signs out) if the server rejects the token.
const call = async (body) => {
  const r = await fetch("/api", body ? authed(body) : {});
  if (r.status === 401) { lost(); return null; }
  return r.json();
};
let chain = Promise.resolve(); // partial-progress taps go to the server one at a time
const cheered = new Set();
const parseView = () => {
  if (location.hash === "#stats") return "stats";
  if (location.hash === "#beer") return "beer";
  const n = parseInt(location.hash.slice(1), 10);
  return n >= 0 && n < 4 ? n : null;
};
const getMe = () => { try { const n = parseInt(localStorage.getItem("me"), 10); return n >= 0 && n < 4 && tok() ? n : null; } catch { return null; } };

function Login({ names, hasPin, onDone }) {
  const [i, setI] = useState(null);
  const [pin, setPin] = useState("");
  const [first, setFirst] = useState(""); // setup: the PIN typed on step 1
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const setup = i !== null && !hasPin[i];
  const reset = () => { setPin(""); setFirst(""); };
  const submit = async (code) => {
    setBusy(true);
    const r = await fetch("/auth", { method: "POST", body: JSON.stringify({ i, pin: code }) });
    const d = await r.json().catch(() => ({}));
    setBusy(false);
    if (r.ok) return onDone(d.me, d.token);
    reset();
    setErr(r.status === 429 ? "Too many tries. Wait 15 minutes, or ask Tommy to reset your PIN." : "Wrong PIN, try again");
  };
  const press = (k) => {
    if (busy) return;
    setErr("");
    if (k === "<") return setPin((x) => x.slice(0, -1));
    const n = pin + k;
    setPin(n);
    if (n.length < 4) return;
    if (!setup) return setTimeout(() => submit(n), 120);
    if (!first) return setTimeout(() => { setFirst(n); setPin(""); }, 150);
    if (n === first) return setTimeout(() => submit(n), 120);
    setTimeout(() => { reset(); setErr("Those didn't match. Start again."); }, 200);
  };
  if (i === null) return (
    <div className="hero">
      <div className="kicker">THE BOYZ</div>
      <h1>WHO ARE<br />YOU?</h1>
      <p>Pick your name.</p>
      <div className="picker">
        {names.map((n, k) => <button key={k} style={{ animationDelay: k * 70 + "ms" }} onClick={() => setI(k)}>{n}</button>)}
      </div>
    </div>
  );
  const msg = !setup ? "Enter your PIN" : first ? "Type it again to confirm" : "Pick a 4-digit PIN";
  return (
    <div className="hero pinpage">
      <div className="kicker">{names[i].toUpperCase()}</div>
      <h2 className="pintitle">{msg}</h2>
      {setup && !first && <p className="pinnote">Remember it. This phone will remember you.</p>}
      <div className={"dots" + (err ? " bad" : "")}>{[0, 1, 2, 3].map((d) => <i key={d} className={d < pin.length ? "on" : ""} />)}</div>
      <div className="err">{err || " "}</div>
      <div className="keypad">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((k) => <button key={k} onClick={() => press(k)}>{k}</button>)}
        <span />
        <button onClick={() => press("0")}>0</button>
        <button className="del" onClick={() => press("<")}>⌫</button>
      </div>
      <a className="swap" onClick={() => { setI(null); reset(); setErr(""); }}>← different name</a>
    </div>
  );
}

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

function Lightbox({ m, reps, onClose }) {
  useScrollLock();
  return (
    <div className="scrim lightbox" onClick={onClose}>
      <button className="xbtn top" aria-label="Close" onClick={onClose}>✕</button>
      <img alt="" src={`/photo?i=${m.i}&day=${m.day}&v=${m.ts}`} />
      <div className="cap">{m.name} · Day {m.day} · {reps} <span>(tap to close)</span></div>
    </div>
  );
}

const EMOJI = ["👍", "❤️", "😂", "🔥", "💪", "😮", "😢", "🙏"];

// Reaction chips under a message (tap a chip to add or remove yours) and a small + that opens the picker.
// Long-pressing the message opens the same picker.
function Reacts({ m, names, me, open, setOpen, react }) {
  const chips = Object.entries(m.re || {}).filter(([, who]) => who.length);
  return (
    <div className="reacts">
      {chips.map(([e, who]) => (
        <button key={e} className={"chip" + (who.includes(me) ? " mine" : "")} title={who.map((i) => names[i]).join(", ")} onClick={() => react(m.id, e)}>
          {e} <span>{who.length}</span>
        </button>
      ))}
      <button className="chip add" aria-label="Add reaction" onClick={() => setOpen(open ? null : m.id)}>{open ? "✕" : "☺+"}</button>
      {open && (
        <div className="epicker">
          {EMOJI.map((e) => (
            <button key={e} className={(m.re?.[e] || []).includes(me) ? "mine" : ""} onClick={() => { react(m.id, e); setOpen(null); }}>{e}</button>
          ))}
        </div>
      )}
    </div>
  );
}

// Long-press (about half a second, finger not moving) calls fn; a scroll or lift cancels it.
function useHold(fn) {
  const t = useRef(null);
  const stop = () => { clearTimeout(t.current); t.current = null; };
  return { onTouchStart: () => { stop(); t.current = setTimeout(() => { t.current = null; fn(); }, 500); }, onTouchMove: stop, onTouchEnd: stop, onTouchCancel: stop, onContextMenu: (e) => { e.preventDefault(); fn(); } };
}

function Item({ m, names, me, open, setOpen, react, children }) {
  const hold = useHold(() => setOpen(m.id));
  return (
    <div className={"msg" + (m.type === "photo" ? " photo" : "") + (m.type === "done" ? " done" : "")} style={m.type === "done" ? { "--pc": COLORS[m.i] } : undefined} {...hold}>
      {children}
      <Reacts m={m} names={names} me={me} open={open === m.id} setOpen={setOpen} react={react} />
    </div>
  );
}

function Board({ names, me }) {
  const [feed, setFeed] = useState([]);
  const [text, setText] = useState("");
  const [big, setBig] = useState(null);
  const [open, setOpen] = useState(null); // id of the message whose emoji picker is showing
  const react = async (id, emoji) => {
    const r = await fetch("/messages", authed({ react: { id, emoji } }));
    if (r.status === 401) return lost();
    if (r.ok) setFeed(await r.json());
  };
  useEffect(() => {
    const load = () => fetch("/messages").then((r) => r.json()).then(setFeed).catch(() => {});
    load();
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, []);
  const post = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    const r = await fetch("/messages", authed({ text }));
    if (r.status === 401) return lost();
    setFeed(await r.json());
    setText("");
  };
  const when = (ts) => new Date(ts).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  const reps = (m) => (m.push != null || m.sit != null || m.pull != null)
    ? `${m.push ?? "–"} push · ${m.sit ?? "–"} sit · ${m.pull ?? "–"} pull` : `Day ${m.day}: ${m.day} of each`;
  return (
    <div className="board">
      <h2>Message board</h2>
      <form onSubmit={post}>
        <input value={text} maxLength={500} placeholder={`Say something, ${names[me]}…`} onChange={(e) => setText(e.target.value)} />
        <button className="send">Post</button>
      </form>
      {feed.map((m) => (
        <Item key={m.id} m={m} names={names} me={me} open={open} setOpen={setOpen} react={react}>
          {m.type === "done" ? (() => {
            const hit = MILES.find((x) => x[0] === m.n), left = 100 - m.n;
            return (<>
              <div className="dline">
                <i className="av">{m.name[0]}</i>
                <div className="dtxt">
                  <div><b>{m.name}</b> finished Day {m.day} ✅ <span>{when(m.ts)}</span></div>
                  <p>{fmt(m.reps)} reps of each so far · {left > 0 ? `${left} to go` : "all 100 done"}</p>
                </div>
              </div>
              {hit && <div className="mile">{hit[2]} {hit[1]}! {m.n} days done</div>}
            </>);
          })() : <><b>{m.name}</b> <span>{when(m.ts)}</span></>}
          {m.type === "photo" ? (<>
            <p className="cap">📸 Day {m.day} · {reps(m)}</p>
            <img loading="lazy" alt={`${m.name} day ${m.day}`} src={`/photo?i=${m.i}&day=${m.day}&v=${m.ts}`} onClick={() => setBig(m)} />
          </>) : <p>{m.text}</p>}
        </Item>
      ))}
      {big && <Lightbox m={big} reps={reps(big)} onClose={() => setBig(null)} />}
    </div>
  );
}

function Admin({ names, hasPin }) {
  const [armed, setArmed] = useState(null);
  const [done, setDone] = useState("");
  const reset = async (t) => {
    if (armed !== t) return setArmed(t);
    await fetch("/auth", authed({ action: "reset", target: t }));
    setArmed(null); setDone(`${names[t]}'s PIN is cleared. They pick a new one next time they sign in.`);
  };
  return (
    <div className="board admin">
      <h2>Tommy's controls</h2>
      {[1, 2, 3].map((t) => (
        <button key={t} className="back" disabled={!hasPin[t]} onClick={() => reset(t)}>
          {!hasPin[t] ? `${names[t]}: no PIN yet` : armed === t ? "Tap again to confirm" : `Reset ${names[t]}'s PIN`}
        </button>
      ))}
      {done && <p className="hint">{done}</p>}
    </div>
  );
}

export default function App() {
  const [s, setS] = useState(null);
  const [toast, setToast] = useState(null);
  const [me, setMe] = useState(getMe);
  const [sheet, setSheet] = useState(null);
  const [pp, setPp] = useState(null); // day whose "add a photo?" card is showing (only right after you check it off)
  // One view: null = home, 0..3 = a person's page, "stats". History rule: home -> sub-page pushes ONE entry;
  // sub-page -> sub-page replaces it; back (swipe or button) always lands on home. A deep link gets a home entry below it.
  const [view, setView] = useState(() => {
    const v = parseView();
    if (v !== null) { history.replaceState(null, "", location.pathname); history.pushState(null, "", "#" + v); }
    return v;
  });
  const who = typeof view === "number" ? view : null;
  const stats = view === "stats";
  useEffect(() => {
    const f = () => { setView(parseView()); setSheet(null); setPp((d) => { if (d) markSeen(getMe(), d); return null; }); window.scrollTo(0, 0); };
    window.addEventListener("popstate", f);
    return () => window.removeEventListener("popstate", f);
  }, []);
  const closePp = () => { setPp(null); };
  // Photos held privately on this device until the day is finished: { day: Blob } for the signed-in person.
  const [held, setHeld] = useState({});
  const heldRef = useRef({}); heldRef.current = held;
  const posting = useRef(new Map()); // day -> time of the last failed try, so a failure waits 30 s
  useEffect(() => {
    setHeld({});
    if (me === null) return;
    let live = true;
    heldDays(me).then((ds) => Promise.all(ds.map(async (d) => [d, await getHeld(me, d)]))).then((es) => {
      if (live) setHeld((h) => ({ ...Object.fromEntries(es.filter((e) => e[1])), ...h }));
    });
    return () => { live = false; };
  }, [me]);
  const holdIt = async (day, blob) => { await holdPhoto(me, day, blob); setHeld((h) => ({ ...h, [day]: blob })); };
  const removeHeld = async (day) => { await dropHeld(me, day); setHeld((h) => { const n = { ...h }; delete n[day]; return n; }); };
  const go = (v) => {
    if (pp) { markSeen(me, pp); setPp(null); }
    if (v === null) { if (view !== null) history.back(); return; }
    history[view === null ? "pushState" : "replaceState"](null, "", "#" + v);
    setView(v); setSheet(null); window.scrollTo(0, 0);
  };
  useEffect(() => {
    const load = () => call().then((d) => d && setS(d)).catch(() => {});
    load();
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => { // drop the card if that day got unchecked or you opened its sheet
    if (pp && s && me !== null && (!s.days[me][pp - 1] || sheet)) { markSeen(me, pp); setPp(null); }
  }, [pp, s, me, sheet]);
  useEffect(() => { // a held photo posts as the day's photo once that day is checked off (by target or by hand)
    if (!s || me === null) return;
    for (const [k, blob] of Object.entries(held)) {
      const day = +k;
      if (!s.days[me]?.[day - 1] || posting.current.has(day)) continue;
      if (s.logs?.[me]?.[day]?.photo) { removeHeld(day); continue; } // already has a photo (e.g. from another phone): don't overwrite
      posting.current.set(day, Date.now());
      fetch("/photo?day=" + day, { method: "POST", headers: authed({}).headers, body: blob }).then(async (r) => {
        if (r.ok || r.status === 413 || r.status === 415) { await removeHeld(day); posting.current.delete(day); if (r.ok) { setToast(`📸 Day ${day} photo posted`); call().then((d) => d && setS(d)); } else setToast("Couldn't post the held photo, add another"); }
        else setTimeout(() => posting.current.delete(day), 30000);
      }).catch(() => setTimeout(() => posting.current.delete(day), 30000));
    }
  }, [s, held, me]);
  const refresh = () => call().then((d) => d && setS(d));
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(null), 3200); return () => clearTimeout(t); } }, [toast]);

  const signIn = (i, t) => { try { localStorage.setItem("me", i); localStorage.setItem("tok", t); } catch {} setMe(i); setView(null); };
  const signOut = () => { try { localStorage.removeItem("me"); localStorage.removeItem("tok"); } catch {} setMe(null); setView(null); history.replaceState(null, "", location.pathname); };
  useEffect(() => { window.addEventListener("boyz-auth", signOut); return () => window.removeEventListener("boyz-auth", signOut); });
  const shell = (kids) => (
    <>
      <div className="blobs"><i /><i /><i /></div>
      <div className="wrap">{kids}</div>
      {toast && <div className="toast" key={toast}>{toast}</div>}
    </>
  );
  if (!s) return shell(<h1 className="hero">Loading…</h1>);

  if (me === null) return shell(<Login names={s.names} hasPin={s.hasPin || []} onDone={signIn} />);

  if (who !== null) {
    const d = s.days[who], c = count(d);
    const next = d.indexOf(false) + 1; // 0 when all done
    const mine = who === me;
    const toggle = (day, ev) => {
      if (d[day - 1]) return setSheet(day); // a finished day opens its details
      if (!mine) return;
      const on = true;
      const nc = c + (on ? 1 : -1);
      if (on) {
        const b = ev.currentTarget.getBoundingClientRect();
        const hit = MILES.find((m) => m[0] === nc);
        burst(b.left + b.width / 2, b.top + b.height / 2, !!hit);
        if (hit) setToast(`${hit[2]} ${hit[1]}! ${nc} days done`);
        navigator.vibrate?.(hit ? [30, 40, 60] : 15);
      }
      setS({ ...s, days: s.days.map((a, k) => (k === who ? a.map((v, j) => (j === day - 1 ? on : v)) : a)) });
      call({ day, on }).then((d) => d && setS(d));
      if (!seen(me, day) && !heldRef.current[day]) setPp(day); // suggest a photo, only for a day you just checked off yourself
    };
    // Partial progress. Taps are sent one at a time so quick taps can't land out of order; the screen updates at once.
    const queue = (body) => {
      chain = chain.then(() => call(body)).catch(() => null).then((nd) => {
        if (!nd) return;
        if (nd.days[me][body.day - 1] && !cheered.has(me + ":" + body.day) && !s.days[me][body.day - 1]) {
          cheered.add(me + ":" + body.day);
          burst(window.innerWidth / 2, window.innerHeight / 2, true);
          navigator.vibrate?.([30, 40, 60]);
          const hit = MILES.find((m) => m[0] === nd.days[me].filter(Boolean).length);
          setToast(hit ? `${hit[2]} ${hit[1]}! ${hit[0]} days done` : `Day ${body.day} done! 🎉`);
          if (!seen(me, body.day) && !heldRef.current[body.day]) setPp(body.day);
        }
        setS(nd);
      });
    };
    const addRep = (day, ex, n) => {
      const cur = s.sess?.[who]?.[day] || { push: 0, sit: 0, pull: 0 };
      const nx = { ...cur, [ex]: cur[ex] + n, last: [ex, n] };
      setS({ ...s, sess: s.sess.map((o, k) => (k === who ? { ...o, [day]: nx } : o)) });
      navigator.vibrate?.(10);
      queue({ action: "rep", day, ex, n });
    };
    const undoRep = (day) => queue({ action: "undo", day });
    const uncheck = (day) => {
      setS({ ...s, days: s.days.map((a, k) => (k === who ? a.map((v, j) => (j === day - 1 ? false : v)) : a)) });
      call({ day, on: false }).then((d) => d && setS(d));
    };
    const t = title(c), r = sum(d);
    return shell(<>
      <button className="back" onClick={() => go(null)}>← Everyone</button>
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
        ? <Today key={next} day={next} me={me} prog={s.sess?.[who]?.[next]} mine={mine} held={held[next] || null} onHold={(b) => holdIt(next, b)} onRemove={() => removeHeld(next)} onAdd={(ex, n) => addRep(next, ex, n)} onUndo={() => undoRep(next)} />
        : <div className="next win"><b>👑 100 DAYS. LEGEND.</b></div>}
      <Graph days={d} />
      <div className="grid">
        {d.map((on, j) => (
          <button key={j} className={"day" + (mine ? "" : " ro") + (on ? " on" : "") + (on && (s.logs?.[who]?.[j + 1]?.photo || s.logs?.[who]?.[j + 1]?.push != null || s.logs?.[who]?.[j + 1]?.sit != null || s.logs?.[who]?.[j + 1]?.pull != null) ? " has" : "") + ((j + 1) % 10 === 0 ? " ten" : "") + (j + 1 === next ? " nxt" : "")}
            title={`Day ${j + 1}: ${j + 1} of each`} disabled={!mine && !on} onClick={(e) => toggle(j + 1, e)}>
            {on ? "✓" : j + 1}
          </button>
        ))}
      </div>
      <p className="hint">{mine ? "Log reps as you go in the card above (it checks the day off by itself at the target), or tap a day when you've done all three. Tap a finished day to log exact reps or add a photo." : `View only. You can only check off your own days (you're ${s.names[me]}). Tap a finished day to see details.`}</p>
      {sheet && <Sheet key={sheet} name={s.names[who]} who={who} day={sheet} log={s.logs?.[who]?.[sheet]} mine={mine} authed={authed}
        onChanged={refresh} onUncheck={() => uncheck(sheet)} />}
      {pp && mine && <PhotoPrompt key={pp} me={me} day={pp} authed={authed} onChanged={refresh} onClose={closePp} />}
    </>);
  }

  if (view === "beer") return shell(<Beer names={s.names} me={me} authed={authed} lost={lost} onBack={() => go(null)} />);

  if (stats) return shell(<Stats s={s} me={me} onBack={() => go(null)} onOpen={(i) => go(i)} />);

  const total = s.days.reduce((t, d) => t + 3 * sum(d), 0);
  const order = s.names.map((_, i) => i).sort((a, b) => count(s.days[b]) - count(s.days[a]));
  return shell(<>
    <div className="hero">
      <div className="kicker">THE BOYZ</div>
      <h1>100 DAY<br />CHALLENGE</h1>
      <p>Day N = <b>N push-ups</b>, <b>N sit-ups</b>, <b>N pull-ups</b>. No days off. 💪</p>
      <div className="total"><b>{fmt(total)}</b> reps crushed together</div>
      <div className="navbtns">
        <button className="statsbtn" onClick={() => go("stats")}>📊 Stats</button>
        <button className="statsbtn beerbtn" onClick={() => go("beer")}>🍺 Beer</button>
      </div>
      <div className="meline">You're <b>{s.names[me]}</b> · <a onClick={signOut}>sign out</a></div>
    </div>
    {order.map((i, rank) => {
      const c = count(s.days[i]), t = title(c);
      return (
        <div className={"card" + (i === me ? " mine" : "")} key={i} style={{ animationDelay: rank * 70 + "ms" }} onClick={() => go(i)}>
          <div className="top">
            <Ring pct={c} />
            <div className="who">
              <span className="name">{c > 0 ? ["👑 ", "🥈 ", "🥉 "][s.days.filter((d) => count(d) > c).length] || "" : ""}{s.names[i]}{i === me && <span className="you">YOU</span>}</span>
              <span className="mini">{t ? `${t[2]} ${t[1]} · ` : ""}{fmt(3 * sum(s.days[i]))} reps</span>
              {(() => { const nx = s.days[i].indexOf(false) + 1, p = nx && s.sess?.[i]?.[nx];
                return p && (p.push || p.sit || p.pull) ? <span className="mini prog">Day {nx} so far: {p.push}/{p.sit}/{p.pull} of {nx}</span> : null; })()}
            </div>
            <span className="num">{c}<small>/100</small></span>
          </div>
        </div>
      );
    })}
    {me === 0 && <Admin names={s.names} hasPin={s.hasPin || []} />}
    <Board names={s.names} me={me} />
  </>);
}
