import { useEffect, useRef, useState } from "react";
import { INSULTS } from "./insults.js";
import { CONFIRM_STEPS, STEPS } from "./jackchain.js";
import { buildMessage, pickRoast, shareMessage, ROB_LINES } from "./share.js";

const COLORS = ["#7c5cff", "#22d3ee", "#ffd34d", "#ff5c8a"];
// Round photo avatar (Jack and Hayden); falls back to the name's initial if the image fails to load.
function Avatar({ src, name }) {
  const [bad, setBad] = useState(false);
  return bad
    ? <i className="bav">{name[0]}</i>
    : <img className="bav" src={src} alt="" width="512" height="512" onError={() => setBad(true)} />;
}

const AVATARS = { 1: "/avatars/hayden.jpg", 3: "/avatars/jack.jpg" }; // by player index; Tommy has none yet
const PLAYERS = [0, 1, 3]; // Tommy, Hayden, Jack. Rob (2) has no counter.
const midnight = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); };

// One popup of Jack's confirmation chain. Layout/position change every step; cancelling restarts the chain next time.
// Taps in the first 400 ms are ignored so he can't just mash the same spot.
const LAYOUTS = ["bl", "br", "bc", "tl", "tr", "bc2"];
function Confirm({ step, total, onYes, onNo }) {
  const [ready, setReady] = useState(false);
  useEffect(() => { setReady(false); const t = setTimeout(() => setReady(true), 400); return () => clearTimeout(t); }, [step]);
  const s = STEPS[step % STEPS.length];
  const lay = LAYOUTS[(step * 5 + 2) % LAYOUTS.length];
  return (
    <div className="scrim cfscrim" role="dialog" aria-modal="true">
      <div className="cfbox" key={step}>
        <div className="cfn">{step + 1} of {total}</div>
        <div className="cfe">{s.e}</div>
        <h2>{s.t}</h2>
        <p>{s.m}</p>
        <div className={"cfbtns " + lay + (step % 3 === 1 ? " flip" : "")}>
          <button className={"cfyes v" + (step % 4)} disabled={!ready} onClick={onYes}>{s.ok}</button>
          <button className="cfno" onClick={onNo}>{s.no}</button>
        </div>
      </div>
    </div>
  );
}

// Beer tab. Everyone sees everyone's counts; only the signed-in person's own card has the + and undo.
// Only Jack (3), when he adds his own beer, gets a random insult popup (never the same one twice in a row).
export default function Beer({ names, me, authed, lost, onBack }) {
  const [d, setD] = useState(null);
  const [bump, setBump] = useState({}); // person -> counter for re-triggering the pop animation
  const [insult, setInsult] = useState(null);
  const [chain, setChain] = useState(-1); // Jack's confirmation step, -1 = not running
  const last = useRef(-1);
  const [note, setNote] = useState(null); // share feedback toast
  const busy = useRef(0);
  const load = () => fetch("/beer?since=" + midnight()).then((r) => r.json()).then((x) => { if (!busy.current) setD(x); }).catch(() => {});
  useEffect(() => { load(); const t = setInterval(load, 4000); return () => clearInterval(t); }, []);
  useEffect(() => { if (insult) { const t = setTimeout(() => setInsult(null), 4500); return () => clearTimeout(t); } }, [insult]);

  useEffect(() => { if (note) { const t = setTimeout(() => setNote(null), 3200); return () => clearTimeout(t); } }, [note]);

  // Share: read-only, never touches the counts. The roast rotates and avoids the one used last on this phone.
  const share = async () => {
    if (!d) return;
    let prev = -1; try { prev = parseInt(localStorage.getItem("roast"), 10); if (isNaN(prev)) prev = -1; } catch {}
    const k = pickRoast(prev);
    try { localStorage.setItem("roast", String(k)); } catch {}
    const r = await shareMessage(buildMessage({ names, d, me, players: PLAYERS, roast: ROB_LINES[k] }));
    if (r === "copied") setNote("Copied! Paste it in a text");
    else if (r === "failed") setNote("Couldn't share on this device");
  };

  const tapPlus = () => { if (me === 3 && CONFIRM_STEPS > 0) setChain(0); else act("add"); };
  const yes = () => { if (chain + 1 >= CONFIRM_STEPS) { setChain(-1); act("add"); } else setChain(chain + 1); };

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
      {d && <button className="sharetop" onClick={share}>📤 Share the standings</button>}
      {!d ? <p className="hint">Loading…</p> : PLAYERS.map((i) => {
        const mine = i === me;
        return (
          <div key={i} className={"beercard" + (mine ? " mine" : "") + (AVATARS[i] ? " herocard" : "")} style={{ "--pc": COLORS[i] }}>
            <div className="bname">{AVATARS[i] && <Avatar src={AVATARS[i]} name={names[i]} />}{names[i]}{mine && <span className="you">YOU</span>}</div>
            <div className="bnums">
              <div className="bbig"><b key={bump[i] || 0} className="bpop">{d.total[i]}</b><span>total</span></div>
              <div className="bbig small"><b>{d.today[i]}</b><span>today</span></div>
            </div>
            {mine && (
              <div className="bbtns">
                <button className="bplus" aria-label="Add a beer" onClick={tapPlus}>+</button>
                <button className="bminus" aria-label="Undo last beer" disabled={!d.total[i]} onClick={() => act("undo")}>− undo</button>
              </div>
            )}
            {mine && <button className="bshare" onClick={share}>📤 Share my count</button>}
          </div>
        );
      })}
      {!canPlay && <p className="hint">View only. {names[me]} isn't on the beer tracker, but you can watch the others.</p>}
      {canPlay && <p className="hint">Only you can change your own count. "Today" resets at midnight on your phone.</p>}
      {chain >= 0 && <Confirm step={chain} total={CONFIRM_STEPS} onYes={yes} onNo={() => setChain(-1)} />}
      {note && <div className="toast" key={note}>{note}</div>}
      {insult && <div className="insult" key={insult.n} onClick={() => setInsult(null)}>🍺 {insult.text}</div>}
    </>
  );
}
