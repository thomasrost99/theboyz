import { useState } from "react";
import { compress } from "./img.js";

const key = (me, day) => `pp:${me}:${day}`;
export const seen = (me, day) => { try { return !!localStorage.getItem(key(me, day)); } catch { return false; } };
export const markSeen = (me, day) => { try { localStorage.setItem(key(me, day), "1"); } catch {} };

// Friendly, non-blocking card that slides up right after you check off a day. Same Android-safe picker as the
// day sheet (a plain image/* file input: camera or gallery). The photo posts to the board as "Day N" next to
// the "finished Day N" post. Once you add a photo or tap "Not now" it never shows again for that day.
export default function PhotoPrompt({ me, day, authed, onChanged, onClose }) {
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);
  const dismiss = () => { markSeen(me, day); onClose(); };
  const upload = async (e) => {
    const input = e.target;
    const f = input.files?.[0];
    if (!f) return;
    setErr(""); setBusy("Shrinking photo…");
    try {
      const blob = await compress(f);
      setBusy("Uploading…");
      const r = await fetch("/photo?day=" + day, { method: "POST", headers: authed({}).headers, body: blob });
      if (r.ok) {
        markSeen(me, day); setBusy(""); setDone(true); onChanged();
        setTimeout(onClose, 1800);
      } else {
        setBusy("");
        setErr(r.status === 401 ? "Signed out, sign in again and retry" : r.status === 413 ? "Photo too big, try another" : "Upload failed (" + r.status + "), try again");
      }
    } catch (x) {
      setBusy("");
      setErr(x instanceof TypeError && /fetch|network/i.test(x.message) ? "No connection, try again" : x.message || "That photo didn't work, try another");
    }
    input.value = "";
  };
  return (
    <div className="ppcard" role="status">
      {done ? (
        <div className="ppdone">📸 Posted to the board. Nice one!</div>
      ) : (<>
        <div className="pptxt"><b>Day {day} done! 💪</b><span>Show the boys. Add a workout photo to the board?</span></div>
        <label className={"filebtn ppbig" + (busy ? " off" : "")}>
          📸 Add a photo
          <input type="file" accept="image/*" onChange={upload} disabled={!!busy} hidden />
        </label>
        {busy && <p className="pphint">{busy}</p>}
        {err && <p className="pphint bad">{err}</p>}
        <button className="ppnot" onClick={dismiss} disabled={!!busy}>Not now</button>
      </>)}
    </div>
  );
}
