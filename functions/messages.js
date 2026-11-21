// Message board in D1: text posts plus proof photos (every photo shows up as a photo post automatically,
// so nobody has to open individual days). Newest first, last 200. Posting text needs a sign-in.
// "done" items are the automatic 'finished Day N' posts written by /api when a day is first checked.
// Each item carries re: {emoji: [person index]}; a POST {react:{id,emoji}} toggles your own reaction (table reacts).
import { NAMES, json, who } from "./lib/auth.js";
import { db } from "./lib/db.js";

const EMOJI = ["👍", "❤️", "😂", "🔥", "💪", "😮", "😢", "🙏"];

export async function onRequest({ request, env }) {
  const D = await db(env);
  if (request.method === "POST") {
    const me = await who(request, env);
    if (me < 0) return json({ error: "auth" }, 401);
    const body = await request.json();
    if (body.react) { // toggle my reaction on a feed item
      const { id, emoji } = body.react;
      if (!EMOJI.includes(emoji) || !/^(m\d+|p[0-3]-\d+|d[0-3]-\d+)$/.test(String(id))) return json({ error: "bad" }, 400);
      const had = await D.prepare("SELECT 1 x FROM reacts WHERE mid=? AND i=? AND emoji=?").bind(id, me, emoji).first();
      await (had
        ? D.prepare("DELETE FROM reacts WHERE mid=? AND i=? AND emoji=?").bind(id, me, emoji)
        : D.prepare("INSERT OR IGNORE INTO reacts(mid,i,emoji,ts) VALUES(?,?,?,?)").bind(id, me, emoji, Date.now())).run();
    }
    const { text } = body;
    const t = String(text || "").trim().slice(0, 500);
    if (t) await D.prepare("INSERT INTO msgs(name,text,ts) VALUES(?,?,?)").bind(NAMES[me], t, Date.now()).run();
  }
  const [m, p, rx, ch] = await D.batch([
    D.prepare("SELECT id,name,text,ts FROM msgs ORDER BY id DESC LIMIT 200"),
    D.prepare("SELECT p.i,p.day,p.ts,d.push,d.sit,d.pull FROM photos p LEFT JOIN days d ON d.i=p.i AND d.day=p.day ORDER BY p.ts DESC LIMIT 100"),
    D.prepare("SELECT mid,i,emoji FROM reacts ORDER BY ts"),
    D.prepare("SELECT i,day,ts,n,reps FROM cheers ORDER BY ts DESC LIMIT 100"),
  ]);
  const by = {}; // id -> { emoji: [person index, ...] }
  for (const r of rx.results) ((by[r.mid] ||= {})[r.emoji] ||= []).push(r.i);
  const feed = [
    ...m.results.map((r) => ({ type: "text", id: "m" + r.id, name: r.name, text: r.text, ts: r.ts, re: by["m" + r.id] || {} })),
    ...p.results.map((r) => ({ type: "photo", id: `p${r.i}-${r.day}`, name: NAMES[r.i], i: r.i, day: r.day, push: r.push, sit: r.sit, pull: r.pull, ts: r.ts, re: by[`p${r.i}-${r.day}`] || {} })),
    ...ch.results.map((r) => ({ type: "done", id: `d${r.i}-${r.day}`, name: NAMES[r.i], i: r.i, day: r.day, n: r.n, reps: r.reps, ts: r.ts, re: by[`d${r.i}-${r.day}`] || {} })),
  ].sort((a, b) => b.ts - a.ts).slice(0, 200);
  return json(feed);
}
