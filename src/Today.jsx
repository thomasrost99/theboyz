import { useState } from "react";

const EXS = [["push", "Push-ups"], ["sit", "Sit-ups"], ["pull", "Pull-ups"]];

// "Up next" card with partial progress: reps logged in sessions so far against the day's target, per exercise.
// The day checks itself off on the server when all three reach the target. `mine` shows the buttons; otherwise view only.
const key = (me, ex) => `lastrep:${me}:${ex}`;
const getLast = (me, ex) => { try { return parseInt(localStorage.getItem(key(me, ex)), 10) || 0; } catch { return 0; } };

export default function Today({ day, me, prog, mine, onAdd, onUndo }) {
  const p = prog || { push: 0, sit: 0, pull: 0, last: null };
  const [open, setOpen] = useState(null); // exercise whose custom-number box is open
  const [val, setVal] = useState("");
  const send = (ex, n) => { if (n > 0) onAdd(ex, n); };
  const [last, setLast] = useState(() => Object.fromEntries(EXS.map(([ex]) => [ex, getLast(me, ex)]))); // last custom number per exercise, remembered on this device
  const custom = (ex) => {
    const n = parseInt(val, 10) || 0;
    if (n > 0) { try { localStorage.setItem(key(me, ex), n); } catch {} setLast((l) => ({ ...l, [ex]: n })); }
    send(ex, n); setOpen(null); setVal("");
  };
  const name = (ex) => EXS.find((e) => e[0] === ex)?.[1].toLowerCase();
  return (
    <div className="next today">
      <small>Up next</small>
      <b>Day {day}</b>
      <span>{day} of each, any number of sessions</span>
      {EXS.map(([ex, label]) => {
        const got = p[ex], left = Math.max(0, day - got), pct = Math.min(100, (got / day) * 100);
        return (
          <div className={"ex" + (left === 0 ? " full" : "")} key={ex}>
            <div className="exhead"><em>{label}</em><strong>{got}<i> / {day}</i>{left === 0 && " ✓"}</strong></div>
            <div className="bar"><u style={{ width: pct + "%" }} /></div>
            {mine && (open === ex ? (
              <form className="exrow" onSubmit={(e) => { e.preventDefault(); custom(ex); }}>
                <input autoFocus inputMode="numeric" pattern="[0-9]*" placeholder="How many?" value={val}
                  onChange={(e) => setVal(e.target.value.replace(/\D/g, "").slice(0, 3))} />
                <button className="add go" disabled={!val}>Add</button>
                <button type="button" className="add" onClick={() => { setOpen(null); setVal(""); }}>✕</button>
              </form>
            ) : (
              <div className="exrow">
                <button className="add" onClick={() => { setOpen(ex); setVal(""); }}>+ #</button>
                {last[ex] > 0 && <button className="add rep" onClick={() => send(ex, last[ex])}>+{last[ex]}</button>}
                {left > 0 && <button className="add fin" onClick={() => send(ex, left)}>Done ({left})</button>}
              </div>
            ))}
          </div>
        );
      })}
      {mine && p.last && (
        <button className="undo" onClick={onUndo}>↶ Undo +{p.last[1]} {name(p.last[0])}</button>
      )}
    </div>
  );
}
