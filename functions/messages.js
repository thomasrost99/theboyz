// Message board in D1: text posts plus proof photos (every photo shows up as a photo post automatically,
// so nobody has to open individual days). Newest first, last 200. Posting text needs a sign-in.
import { NAMES, json, who } from "./lib/auth.js";
import { db } from "./lib/db.js";

export async function onRequest({ request, env }) {
  const D = await db(env);
  if (request.method === "POST") {
    const me = await who(request, env);
    if (me < 0) return json({ error: "auth" }, 401);
    const { text } = await request.json();
    const t = String(text || "").trim().slice(0, 500);
    if (t) await D.prepare("INSERT INTO msgs(name,text,ts) VALUES(?,?,?)").bind(NAMES[me], t, Date.now()).run();
  }
  const [m, p] = await D.batch([
    D.prepare("SELECT id,name,text,ts FROM msgs ORDER BY id DESC LIMIT 200"),
    D.prepare("SELECT p.i,p.day,p.ts,d.push,d.sit,d.pull FROM photos p LEFT JOIN days d ON d.i=p.i AND d.day=p.day ORDER BY p.ts DESC LIMIT 100"),
  ]);
  const feed = [
    ...m.results.map((r) => ({ type: "text", id: "m" + r.id, name: r.name, text: r.text, ts: r.ts })),
    ...p.results.map((r) => ({ type: "photo", id: `p${r.i}-${r.day}`, name: NAMES[r.i], i: r.i, day: r.day, push: r.push, sit: r.sit, pull: r.pull, ts: r.ts })),
  ].sort((a, b) => b.ts - a.ts).slice(0, 200);
  return json(feed);
}
