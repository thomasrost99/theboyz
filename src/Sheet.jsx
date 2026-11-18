import { useEffect, useRef, useState } from "react";
import { compress } from "./img.js";
import { useScrollLock } from "./lock.js";

// Bottom sheet for one finished day: optional exact rep log, proof photo, uncheck.
export default function Sheet({ name, who, day, log, mine, authed, onChanged, onUncheck }) {
  useScrollLock();
  const [v, setV] = useState({ push: log?.push ?? "", sit: log?.sit ?? "", pull: log?.pull ?? "" });
  const [busy, setBusy] = useState("");
  const [armed, setArmed] = useState(false);
  const [bust, setBust] = useState(0); // forces the photo to reload after upload
  const [photo, setPhoto] = useState(!!log?.photo);

  // Back (swipe or button) closes the sheet: it owns one history entry; App's popstate handler unmounts it.
  useEffect(() => { history.pushState({ sheet: 1 }, ""); }, []);
  const close = () => history.back();
  const drag = useRef(null);
  const [dy, setDy] = useState(0);
  const ts = { // swipe down on the header to dismiss
    onTouchStart: (e) => { drag.current = e.touches[0].clientY; },
    onTouchMove: (e) => { if (drag.current !== null) setDy(Math.max(0, e.touches[0].clientY - drag.current)); },
    onTouchEnd: () => { const far = dy > 90; drag.current = null; setDy(0); if (far) close(); },
  };

  const save = async () => {
    setBusy("Saving…");
    await fetch("/api", authed({ action: "log", day, push: v.push, sit: v.sit, pull: v.pull }));
    setBusy("");
    onChanged();
  };
  const upload = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy("Shrinking photo…");
    try {
      const blob = await compress(f);
      setBusy("Uploading…");
      const r = await fetch("/photo?day=" + day, { method: "POST", headers: authed({}).headers, body: blob });
      if (r.ok) { setPhoto(true); setBust(Date.now()); onChanged(); }
      else setBusy("Upload failed, try again");
      if (r.ok) setBusy("");
    } catch { setBusy("That photo didn't work, try another"); }
    e.target.value = "";
  };
  const removePhoto = async () => {
    await fetch("/photo?day=" + day, { method: "DELETE", headers: authed({}).headers });
    setPhoto(false); onChanged();
  };
  const field = (k, label) => (
    <label>
      <span>{label}</span>
      <input inputMode="numeric" pattern="[0-9]*" disabled={!mine} placeholder={String(day)} value={v[k]}
        onChange={(e) => setV({ ...v, [k]: e.target.value.replace(/\D/g, "").slice(0, 4) })} />
    </label>
  );
  return (
    <div className="scrim" onClick={close}>
      <div className="sheet" style={dy ? { transform: `translateY(${dy}px)`, transition: "none" } : undefined} onClick={(e) => e.stopPropagation()}>
        <div className="shead" {...ts}>
          <div className="grab" />
          <button className="xbtn" aria-label="Close" onClick={close}>✕</button>
          <h2>{name} · Day {day}</h2>
        </div>
        <p className="sub">Target: {day} push-ups, {day} sit-ups, {day} pull-ups</p>
        <div className="logrow">{field("push", "Push-ups")}{field("sit", "Sit-ups")}{field("pull", "Pull-ups")}</div>
        {mine
          ? <p className="hint left">Optional. Log the real numbers if you want them in your stats; leave blank and the target counts.</p>
          : (log?.push == null && log?.sit == null && log?.pull == null) && <p className="hint left">No exact reps logged.</p>}
        {mine && <button className="send wide" onClick={save} disabled={!!busy}>Save reps</button>}
        {photo && <img className="proof" alt={`${name} day ${day}`} src={`/photo?i=${who}&day=${day}&v=${bust}`} />}
        {mine && (
          <div className="row2">
            <label className="filebtn">
              📸 {photo ? "Replace photo" : "Add proof photo"}
              <input type="file" accept="image/*" capture="environment" onChange={upload} hidden />
            </label>
            {photo && <button className="back" onClick={removePhoto}>Remove</button>}
          </div>
        )}
        {busy && <p className="hint">{busy}</p>}
        {mine && (
          <button className="danger" onClick={() => { if (!armed) return setArmed(true); onUncheck(); history.back(); }}>
            {armed ? "Tap again: uncheck day (deletes reps & photo)" : "Uncheck this day"}
          </button>
        )}
        <button className="back close" onClick={close}>Close</button>
      </div>
    </div>
  );
}
