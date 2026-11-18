// Message board in D1, newest first, last 200. Posting needs a sign-in.
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
  const { results } = await D.prepare("SELECT name,text,ts FROM msgs ORDER BY id DESC LIMIT 200").all();
  return json(results);
}
