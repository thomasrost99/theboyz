import { useEffect, useRef, useState } from "react";
import { INSULTS } from "./insults.js";

const COLORS = ["#7c5cff", "#22d3ee", "#ffd34d", "#ff5c8a"];
const PLAYERS = [0, 1, 3]; // Tommy, Hayden, Jack. Rob (2) has no counter.
const midnight = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); };

// Beer tab. Everyone sees everyone's counts; only the signed-in person's own card has the + and undo.
// Only Jack (3), when he adds his own beer, gets a random insult popup (never the same one twice in a row).
export default function Beer({ names, me, authed, lost, onBack }) {
  const [d, setD] = useState(null);
  const [bump, setBump] = useState({}); // person -> counter for re-triggering the pop animation
  const [insult, setInsult] = useState(null);
  const last = useRef(-1);
  const busy = useRef(0);
  const load = () => fetch("/beer?since=" + midnight()).then((r) => r.json()).then((x) => { if (!busy.current) setD(x); }).catch(() => {});
  useEffect(() => { load(); const t = setInterval(load, 4000); return () => clearInterval(t); }, []);
  useEffect(() => { if (insult) { const t = setTimeout(() => setInsult(null), 4500); return () => clearTimeout(t); } }, [insult]);

  const act = async (action) => {
    if (!d) return;
    const dlt = action === "add" ? 1 : -1;
    if (dlt < 0 && !d.total[me]) return;
    const pop = (k) => setBump((b) => ({ ...b, [k]: (b[k] || 0) + 1 }));
    setD({ ...d, total: d.total.map((v, k) => (k === me ? v + dlt : v)), today: d.today.map((v, k) => (k === me ? Math.max(0, v + dlt) : v)) });
    pop(me);
    if (dlt > 0) {
      navigator.vibrate?.(20);
      if (me === 3) { // Jack only
        let k;
        do k = Math.floor(Math.random() * INSULTS.length); while (k === last.current && INSULTS.length > 1);
        last.current = k;
        setInsult({ k, text: INSULTS[k], n: Date.now() });
      }
    } else setInsult(null);
    busy.current++;
    try {
      const r = await fetch("/beer", authed({ action, since: midnight() }));
      if (r.status === 401) return lost();
      if (r.ok) setD(await r.json());
    } catch {} finally { busy.current--; }
  };

  const canPlay = PLAYERS.includes(me);
  return (
    <>
      <button className="back" onClick={onBack}>← Everyone</button>
      <div className="hero beerhero">
        <div className="kicker">THE BOYZ</div>
        <h1>BEER<br />TRACKER</h1>
        <div className="beermoji">🍺</div>
      </div>
      {!d ? <p className="hint">Loading…</p> : PLAYERS.map((i) => {
        const mine = i === me;
        return (
          <div key={i} className={"beercard" + (mine ? " mine" : "")} style={{ "--pc": COLORS[i] }}>
            <div className="bname">{names[i]}{mine && <span className="you">YOU</span>}</div>
            <div className="bnums">
              <div className="bbig"><b key={bump[i] || 0} className="bpop">{d.total[i]}</b><span>total</span></div>
              <div className="bbig small"><b>{d.today[i]}</b><span>today</span></div>
            </div>
            {mine && (
              <div className="bbtns">
                <button className="bplus" aria-label="Add a beer" onClick={() => act("add")}>+</button>
                <button className="bminus" aria-label="Undo last beer" disabled={!d.total[i]} onClick={() => act("undo")}>− undo</button>
              </div>
            )}
          </div>
        );
      })}
      {!canPlay && <p className="hint">View only. {names[me]} isn't on the beer tracker, but you can watch the others.</p>}
      {canPlay && <p className="hint">Only you can change your own count. "Today" resets at midnight on your phone.</p>}
      {insult && <div className="insult" key={insult.n} onClick={() => setInsult(null)}>🍺 {insult.text}</div>}
    </>
  );
}
